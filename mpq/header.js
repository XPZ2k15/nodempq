const { Buffer } = require('buffer');

/**
 * Header represents the MPQ file header structure.
 * @typedef {Object} Header
 * @property {string} Magic - Should equal "MPQ\x1A".
 * @property {number} HeaderSize
 * @property {number} ArchiveSize
 * @property {number} FormatVersion
 * @property {number} BlockSize
 * @property {number} HashTableOffset
 * @property {number} BlockTableOffset
 * @property {number} HashTableEntries
 * @property {number} BlockTableEntries
 */

/**
 * Reads the MPQ header from the beginning of the file.
 * @param {{ read(buffer: Buffer, offset: number, length: number, position: number|null): Promise<{bytesRead:number}> }} fileHandle
 * @param {Header} headerObj - Object to populate with header fields.
 * @returns {Promise<void>}
 * @throws {Error} If the magic is invalid or read fails.
 */
async function readHeader(fileHandle, headerObj) {
  // Read 32 bytes: 4*byte + 7*uint32/uint16 = 4 + (4*5 + 2*2) = 4 + 24 = 28? We'll read exact size of headerObj.
  const buffer = Buffer.alloc(4 + 4 + 4 + 2 + 2 + 4 + 4 + 4 + 4);
  const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, 0);
  if (bytesRead !== buffer.length) throw new Error('Failed to read full MPQ header');

  // Parse fields
  headerObj.Magic = buffer.slice(0, 4).toString('ascii');
  if (headerObj.Magic !== 'MPQ\x1A') throw new Error('invalid mpq header');
  let offset = 4;
  headerObj.HeaderSize = buffer.readUInt32LE(offset);
  offset += 4;
  headerObj.ArchiveSize = buffer.readUInt32LE(offset);
  offset += 4;
  headerObj.FormatVersion = buffer.readUInt16LE(offset);
  offset += 2;
  headerObj.BlockSize = buffer.readUInt16LE(offset);
  offset += 2;
  headerObj.HashTableOffset = buffer.readUInt32LE(offset);
  offset += 4;
  headerObj.BlockTableOffset = buffer.readUInt32LE(offset);
  offset += 4;
  headerObj.HashTableEntries = buffer.readUInt32LE(offset);
  offset += 4;
  headerObj.BlockTableEntries = buffer.readUInt32LE(offset);
}

module.exports = { readHeader };
