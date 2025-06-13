const { decryptTable } = require('./crypto');
const path = require('path');

// FileFlag constants
const FileFlag = Object.freeze({
  FileImplode: 0x00000100,
  FileCompress: 0x00000200,
  FileEncrypted: 0x00010000,
  FileFixKey: 0x00020000,
  FilePatchFile: 0x00100000,
  FileSingleUnit: 0x01000000,
  FileDeleteMarker: 0x02000000,
  FileSectorCrc: 0x04000000,
  FileExists: 0x80000000,
});

class Block {
  constructor({ FilePosition, CompressedFileSize, UncompressedFileSize, Flags }) {
    this.FilePosition = FilePosition >>> 0;
    this.CompressedFileSize = CompressedFileSize >>> 0;
    this.UncompressedFileSize = UncompressedFileSize >>> 0;
    this.Flags = Flags >>> 0;

    // Local properties
    this.FileName = '';
    this.EncryptionSeed = 0;
  }

  hasFlag(flag) {
    return (this.Flags & flag) !== 0;
  }

  calculateEncryptionSeed(fileName) {
    // strip path, keep basename
    const base = path.basename(fileName);
    const seed = require('./crypto').hashString(base, 3);
    this.EncryptionSeed = ((seed + this.FilePosition) ^ this.UncompressedFileSize) >>> 0;
  }
}

// Attach readBlockTable to MPQ prototype
async function readBlockTable(mpq) {
  // seek to block table offset
  await mpq.fileHandle.read(Buffer.alloc(0), 0, 0, mpq.header.BlockTableOffset);

  const blockData = await decryptTable(mpq.fileHandle, mpq.header.BlockTableEntries, '(block table)', mpq.header.BlockTableOffset); // blockData is Uint32Array of length entries*4
  mpq.blocks = [];
  for (let i = 0, n = 0; i < mpq.header.BlockTableEntries; i++, n += 4) {
    mpq.blocks.push(
      new Block({
        FilePosition: blockData[n],
        CompressedFileSize: blockData[n + 1],
        UncompressedFileSize: blockData[n + 2],
        Flags: blockData[n + 3],
      })
    );
  }
}

module.exports = { FileFlag, Block, readBlockTable };
