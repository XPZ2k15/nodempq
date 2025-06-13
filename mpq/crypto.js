const { Buffer } = require('buffer');

// Global crypto buffer and initialization flag
const cryptoBuffer = new Uint32Array(0x500);
let cryptoBufferReady = false;

function cryptoLookup(index) {
  if (!cryptoBufferReady) {
    cryptoInitialize();
    cryptoBufferReady = true;
  }
  return cryptoBuffer[index];
}

// Initialize crypto buffer
function cryptoInitialize() {
  let seed = 0x00100001;
  for (let index1 = 0; index1 < 0x100; index1++) {
    let index2 = index1;
    for (let i = 0; i < 5; i++) {
      seed = (seed * 125 + 3) % 0x2aaaab;
      const temp1 = (seed & 0xffff) << 16;
      seed = (seed * 125 + 3) % 0x2aaaab;
      const temp2 = seed & 0xffff;
      cryptoBuffer[index2] = temp1 | temp2;
      index2 += 0x100;
    }
  }
}

// Decrypt array of uint32
function decrypt(data, seed) {
  let seed2 = 0xeeeeeeee >>> 0;
  for (let i = 0; i < data.length; i++) {
    seed2 = (seed2 + cryptoLookup(0x400 + (seed & 0xff))) >>> 0;
    let result = data[i] >>> 0;
    result = (result ^ (seed + seed2)) >>> 0;
    seed = (((~seed << 21) + 0x11111111) | (seed >>> 11)) >>> 0;
    seed2 = (result + seed2 + (seed2 << 5) + 3) >>> 0;
    data[i] = result;
  }
}

// Decrypt Buffer in-place
function decryptBytes(buffer, seed) {
  let seed2 = 0xeeeeeeee >>> 0;
  for (let i = 0; i + 3 < buffer.length; i += 4) {
    seed2 = (seed2 + cryptoLookup(0x400 + (seed & 0xff))) >>> 0;
    let result = buffer.readUInt32LE(i) >>> 0;
    result = (result ^ (seed + seed2)) >>> 0;
    seed = (((~seed << 21) + 0x11111111) | (seed >>> 11)) >>> 0;
    seed2 = (result + seed2 + (seed2 << 5) + 3) >>> 0;
    buffer.writeUInt32LE(result, i);
  }
}

// Decrypt table from a FileHandle or reader with async read method
async function decryptTable(reader, size, name, offset) {
  let seed = hashString(name, 3);
  let seed2 = 0xeeeeeeee >>> 0;
  const count = size * 4;
  const table = new Uint32Array(count);
  const buf = Buffer.alloc(4);

  let pos = offset;
  for (let i = 0; i < count; i++) {
    seed2 = (seed2 + cryptoLookup(0x400 + (seed & 0xff))) >>> 0;
    const { bytesRead } = await reader.read(buf, 0, 4, pos);
    pos += 4;
    if (bytesRead !== 4) break;
    let result = buf.readUInt32LE(0) >>> 0;
    result = (result ^ (seed + seed2)) >>> 0;
    // Update seeds
    // Note: seed is const; reassigning for logic
    seed2 = (result + seed2 + (seed2 << 5) + 3) >>> 0;
    table[i] = result;
    seed = (((~seed << 21) + 0x11111111) | (seed >>> 11)) >>> 0;
  }

  return table;
}

// Hash filename into 64-bit (as JS number may lose precision beyond 53 bits)
function hashFilename(key) {
  const a = hashString(key, 1);
  const b = hashString(key, 2);
  // Combine into BigInt
  return (BigInt(a) << 32n) | BigInt(b);
}

// Hash string (MPQ algorithm)
function hashString(key, hashType) {
  let seed1 = 0x7fed7fed >>> 0;
  let seed2 = 0xeeeeeeee >>> 0;
  const upper = key.toUpperCase();
  for (const c of upper) {
    const charCode = c.charCodeAt(0) >>> 0;
    seed1 = (cryptoLookup(hashType * 0x100 + charCode) ^ (seed1 + seed2)) >>> 0;
    seed2 = (charCode + seed1 + seed2 + (seed2 << 5) + 3) >>> 0;
  }
  return seed1;
}

// Encrypt array of uint32 in-place
function encrypt(data, seed) {
  let seed2 = 0xeeeeeeee >>> 0;
  for (let i = 0; i < data.length; i++) {
    seed2 = (seed2 + cryptoLookup(0x400 + (seed & 0xff))) >>> 0;
    let result = data[i] >>> 0;
    result = (result ^ (seed + seed2)) >>> 0;
    seed = (((~seed << 21) + 0x11111111) | (seed >>> 11)) >>> 0;
    seed2 = (data[i] + seed2 + (seed2 << 5) + 3) >>> 0;
    data[i] = result;
  }
}

module.exports = {
  cryptoLookup,
  decrypt,
  decryptBytes,
  decryptTable,
  hashFilename,
  hashString,
  encrypt,
};
