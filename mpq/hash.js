const { decryptTable } = require('./crypto');
const { Buffer } = require('buffer');

/**
 * Represents a hashed file entry in the MPQ archive.
 */
class Hash {
  /**
   * @param {Object} params
   * @param {number} params.A
   * @param {number} params.B
   * @param {number} params.Locale
   * @param {number} params.Platform
   * @param {number} params.BlockIndex
   */
  constructor({ A, B, Locale, Platform, BlockIndex }) {
    /** @type {number} */ this.A = A >>> 0;
    /** @type {number} */ this.B = B >>> 0;
    /** @type {number} */ this.Locale = Locale & 0xffff;
    /** @type {number} */ this.Platform = Platform & 0xffff;
    /** @type {number} */ this.BlockIndex = BlockIndex >>> 0;
  }

  /**
   * Returns the combined A and B as a 64-bit BigInt.
   * @returns {bigint}
   */
  name64() {
    return (BigInt(this.A) << 32n) | BigInt(this.B);
  }
}

/**
 * Reads and decrypts the hash table from the MPQ file, populating mpq.hashes.
 * @param {Object} mpq - An MPQ instance with fileHandle and header properties.
 * @returns {Promise<void>}
 */
async function readHashTable(mpq) {
  // Seek to hash table offset
  await mpq.fileHandle.read(Buffer.alloc(0), 0, 0, mpq.header.HashTableOffset);

  // Decrypt the hash table entries
  const entries = mpq.header.HashTableEntries;
  const hashData = await decryptTable(mpq.fileHandle, entries, '(hash table)', mpq.header.HashTableOffset);
  // Initialize the map
  mpq.hashes = new Map();

  // Each entry consists of 4 uint32 values: A, B, locale|platform, blockIndex
  for (let i = 0, n = 0; i < entries; i++, n += 4) {
    const A = hashData[n];
    const B = hashData[n + 1];
    const combined = hashData[n + 2] >>> 0;
    const Locale = combined >>> 16;
    const Platform = combined & 0xffff;
    const BlockIndex = hashData[n + 3];

    const h = new Hash({ A, B, Locale, Platform, BlockIndex });
    mpq.hashes.set(h.name64(), h);
  }
}

module.exports = { Hash, readHashTable };
