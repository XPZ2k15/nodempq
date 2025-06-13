// mpq.js
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');

const { readHeader } = require('./header');
const { readHashTable } = require('./hash');
const { readBlockTable } = require('./block');

class MPQ {
  /**
   * @param {string} filePath
   * @param {fs.FileHandle} fileHandle
   */
  constructor(filePath, fileHandle) {
    this.filePath = filePath;
    this.fileHandle = fileHandle;
    this.header = {}; // populated by readHeader
    this.hashes = new Map(); // big-int key → Hash
    this.blocks = []; // Array<Block>
  }

  /* ---------- helpers ---------- */

  static async _openIgnoreCase(p) {
    // Case-insensitive open for Linux
    const base = path.basename(p);
    const dir = path.dirname(p);
    for (const f of await fsp.readdir(dir)) {
      if (f.toLowerCase() === base.toLowerCase()) {
        return fsp.open(path.join(dir, f), 'r');
      }
    }
    throw new Error(`file not found: ${p}`);
  }

  /* ---------- constructors ---------- */

  static async New(fileName) {
    const opener = os.platform() === 'linux' ? MPQ._openIgnoreCase : (p) => fsp.open(p, 'r');

    const fh = await opener(fileName);
    const mpq = new MPQ(fileName, fh);
    try {
      await readHeader(fh, mpq.header);
    } catch (e) {
      await fh.close();
      throw new Error(`failed to read header: ${e.message}`);
    }
    return mpq;
  }

  static async FromFile(fileName) {
    const mpq = await MPQ.New(fileName);
    try {
      await readHashTable(mpq);
      await readBlockTable(mpq);
    } catch (e) {
      await mpq.close();
      throw e;
    }
    return mpq;
  }

  /* ---------- core helpers ---------- */

  getFileBlockData(fileName) {
    const key = require('./crypto').hashFilename(fileName);
    const entry = this.hashes.get(key);
    if (!entry) throw new Error('file not found');
    if (entry.BlockIndex >= this.blocks.length) throw new Error('invalid block index');
    return this.blocks[entry.BlockIndex];
  }

  async close() {
    await this.fileHandle.close();
  }

  /* ---------- public API ---------- */

  async readFile(fileName) {
    const { CreateStream } = require('../stream/stream'); // lazy – avoid cycles
    const block = this.getFileBlockData(fileName);
    block.FileName = fileName.toLowerCase();

    const raw = await CreateStream(this, block, fileName); // Stream
    const buf = Buffer.alloc(block.UncompressedFileSize);
    await raw.read(buf, 0, buf.length, 0); // Node-style
    return buf;
  }

  async readTextFile(fileName) {
    const buf = await this.readFile(fileName);
    return buf.toString('utf8');
  }

  async readFileStream(fileName) {
    const { CreateStream } = require('../stream/stream');
    const { DataStream } = require('../stream/data_stream');
    const block = this.getFileBlockData(fileName);
    block.FileName = fileName.toLowerCase();
    const raw = await CreateStream(this, block, fileName); // Stream
    return new DataStream(raw);
  }

  async listfile() {
    if (!this.contains('(listfile)')) return [];
    const raw = await this.readTextFile('(listfile)');
    return raw.replace(/\x00+$/, '').split(/\r?\n/);
  }

  /* ---------- misc ---------- */

  contains(fileName) {
    const key = require('./crypto').hashFilename(fileName);
    return this.hashes.has(key);
  }

  size() {
    return this.header.ArchiveSize;
  }
  path() {
    return this.filePath;
  }
}

module.exports = { MPQ };
