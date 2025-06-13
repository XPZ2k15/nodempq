// stream.js ────────────────────────────────────────────────────────────────
const zlib = require('zlib');
const wav = require('wav');
const { Readable } = require('stream');
const { decrypt, decryptBytes } = require('../mpq/crypto');
const { FileFlag } = require('../mpq/block');

/**
 * Low-level MPQ sector stream (one instance per file).
 * Exposes:
 *   • Read(buf, off, len)          – Blizzard-style API
 *   • read(buf, off, len, pos?)    – Node fs.read-style wrapper (used by DataStream)
 *   • Position / Size              – cursor & sector size (public state)
 */
class Stream {
  /**
   * @param {{ MPQ:   import('../mpq/mpq').MPQ,
   *           Block: import('../mpq/block').Block,
   *           FileName: string }}
   */
  constructor({ MPQ, Block, FileName }) {
    this.MPQ = MPQ;
    this.Block = Block;
    this.FileName = FileName;

    this.Size = 0x200 << MPQ.header.BlockSize; // sector size in bytes
    this.Position = 0; // absolute cursor within file
    this.Index = 0xffffffff; // cached sector index
    this.Data = Buffer.alloc(0); // cached sector data
    this.Positions = []; // sector-offset table (for compressed files)
  }

  /*──────────────────────── factory ────────────────────────*/
  static async create(mpq, block, fileName) {
    const s = new Stream({ MPQ: mpq, Block: block, FileName: fileName });

    if (block.hasFlag(FileFlag.FileFixKey)) {
      block.calculateEncryptionSeed(fileName);
    }
    if (block.hasFlag(FileFlag.FilePatchFile)) {
      throw new Error('patch-file support is not implemented');
    }
    if ((block.hasFlag(FileFlag.FileCompress) || block.hasFlag(FileFlag.FileImplode)) && !block.hasFlag(FileFlag.FileSingleUnit)) {
      await s.#loadSectorTable();
    }
    return s;
  }

  /*──────────────────────── public read APIs ───────────────*/

  /** Blizzard-style read (used internally & by Node wrapper) */
  async Read(buf, bufOff, count) {
    // single-unit file → one big blob
    if (this.Block.hasFlag(FileFlag.FileSingleUnit)) {
      return this.#readSingleUnit(buf, bufOff, count);
    }

    // multi-sector file
    let copied = 0;
    let remain = count;
    while (remain > 0) {
      const n = await this.#readSector(buf, bufOff + copied, remain);
      if (n === 0) break; // EOF
      copied += n;
      remain -= n;
    }
    return copied;
  }

  /** Node-style fs.read wrapper (used by data_stream.js) */
  async read(buf, off, len, pos = null) {
    if (pos !== null) this.Position = pos >>> 0;
    const bytesRead = await this.Read(buf, off, len);
    return { bytesRead };
  }

  /*──────────────────────── sector-table handling ──────────*/

  async #loadSectorTable() {
    const fd = this.MPQ.fileHandle;
    const tableOff = this.Block.FilePosition;
    const count = Math.floor((this.Block.UncompressedFileSize + this.Size - 1) / this.Size) + 1;
    const buf = Buffer.alloc(count * 4);

    await fd.read(buf, 0, buf.length, tableOff);
    this.Positions = new Uint32Array(buf.buffer, buf.byteOffset, count);

    if (this.Block.hasFlag(FileFlag.FileEncrypted)) {
      decrypt(this.Positions, this.Block.EncryptionSeed - 1);

      const expectedBytes = count * 4;
      if (this.Positions[0] !== expectedBytes || this.Positions[1] > this.Size + expectedBytes) {
        throw new Error('sector-table decryption failed (wrong key?)');
      }
    }
  }

  /*──────────────────────── single-unit helpers ────────────*/

  async #ensureBigBlobLoaded() {
    if (this.Data.length) return;

    const fd = this.MPQ.fileHandle;
    const off = this.Block.FilePosition;
    const buf = Buffer.alloc(this.Block.CompressedFileSize);

    await fd.read(buf, 0, buf.length, off);

    if (this.Block.hasFlag(FileFlag.FileEncrypted)) {
      if (!this.Block.EncryptionSeed) throw new Error('encryption key missing');
      decryptBytes(buf, this.Block.EncryptionSeed);
    }

    if ((this.Block.hasFlag(FileFlag.FileCompress) || this.Block.hasFlag(FileFlag.FileImplode)) && this.Block.CompressedFileSize !== this.Block.UncompressedFileSize) {
      this.Data = await Stream.#decompress(buf);
    } else {
      this.Data = buf;
    }
  }

  async #readSingleUnit(dst, dstOff, count) {
    await this.#ensureBigBlobLoaded();
    return this.#copyOut(dst, dstOff, this.Position, count);
  }

  /*──────────────────────── multi-sector helpers ───────────*/

  async #readSector(dst, dstOff, count) {
    await this.#ensureSectorCached();
    const localPos = this.Position % this.Size;
    return this.#copyOut(dst, dstOff, localPos, count);
  }

  async #ensureSectorCached() {
    const idx = Math.floor(this.Position / this.Size);
    if (idx === this.Index) return; // already cached

    const need = Math.min(this.Block.UncompressedFileSize - idx * this.Size, this.Size);
    this.Data = await this.#loadSector(idx, need);
    this.Index = idx;
  }

  async #loadSector(idx, need) {
    const fd = this.MPQ.fileHandle;
    let off, toRead;

    if (this.Block.hasFlag(FileFlag.FileCompress) || this.Block.hasFlag(FileFlag.FileImplode)) {
      off = this.Positions[idx];
      toRead = this.Positions[idx + 1] - off;
    } else {
      off = idx * this.Size;
      toRead = need;
    }
    off += this.Block.FilePosition;

    const buf = Buffer.alloc(toRead);
    await fd.read(buf, 0, toRead, off);

    if (this.Block.hasFlag(FileFlag.FileEncrypted) && this.Block.UncompressedFileSize > 3) {
      if (!this.Block.EncryptionSeed) throw new Error('encryption key missing');
      decryptBytes(buf, idx + this.Block.EncryptionSeed);
    }

    if ((this.Block.hasFlag(FileFlag.FileCompress) || this.Block.hasFlag(FileFlag.FileImplode)) && toRead !== need) {
      return Stream.#decompress(buf);
    }
    return buf;
  }

  /*──────────────────────── buffer copy helper ─────────────*/

  #copyOut(dst, dstOff, srcOff, count) {
    const avail = Math.min(this.Data.length - srcOff, count);
    if (avail <= 0) {
      const err = new Error('EOF');
      err.code = 'EOF';
      throw err;
    }
    this.Data.copy(dst, dstOff, srcOff, srcOff + avail);
    this.Position += avail;
    return avail;
  }

  /*──────────────────────── decompression ──────────────────*/

  static async #decompress(buf) {
    const type = buf[0];
    const payload = buf.slice(1);

    switch (type) {
      case 2:
        return Stream.#inflate(payload); // zlib deflate
      case 8:
        return Stream.#pkExplode(payload); // PKWARE DCL
      case 0x80:
        return wav.WavDecompress(payload, 2); // ADPCM stereo
      case 0x40:
        return wav.WavDecompress(payload, 1); // ADPCM mono
      default:
        throw new Error(`unknown compression type 0x${type.toString(16)}`);
    }
  }

  static #inflate(data) {
    return new Promise((res, rej) => zlib.inflate(data, (err, out) => (err ? rej(err) : res(out))));
  }

  /**
   * PKWARE “explode” (DCL) — works with both “buffer API” *and*
   * Transform-stream API provided by different versions of node-pkware.
   */
  static async #pkExplode(data) {
    const mod = await import('node-pkware'); // dynamic ESM import
    const explode = mod.explode ?? mod.default ?? mod;

    // ⬇ NEW — wrap the transform function so it behaves like a stream
    const through = mod.stream?.through ?? require('node-pkware').stream.through;
    /* 1️⃣  Try the *buffer API* directly (sync return). */
    try {
      const out = await explode(data); // ✅ await handles both
      if (out && (out instanceof Uint8Array || Buffer.isBuffer(out))) return Buffer.from(out);
    } catch {
      /* fall through */
    }

    /* 2️⃣  Fallback: treat explode() as a Transform-stream factory. */
    return new Promise((resolve, reject) => {
      const chunks = [];
      Readable.from([data])
        .pipe(through(explode())) // ✅ wrap → real Transform stream
        .on('data', (c) => chunks.push(c))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });
  }
}

/*──────────────────────── exported factory ──────────────────────────*/

/** Returns a low-level Stream; DataStream wrapper is created in mpq.js */
async function CreateStream(mpq, block, name) {
  return Stream.create(mpq, block, name);
}

module.exports = { Stream, CreateStream };
