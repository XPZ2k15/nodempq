// data_stream.js
const fs = require('fs');
const { SEEK_SET, SEEK_CUR, SEEK_END } = fs.constants;

/**
 * DataStream wraps a low-level stream object with read/seek/close semantics.
 * @typedef {{
 *   read(buffer: Buffer, offset: number, length: number, position: number|null): Promise<{bytesRead:number}>;
 *   Position: number;
 *   Size: number;
 * }} LowLevelStream
 */

class DataStream {
  /**
   * @param {LowLevelStream} stream
   */
  constructor(stream) {
    this.stream = stream;
  }

  /**
   * Reads up to p.length bytes into p at the current stream position.
   * @param {Buffer} p
   * @returns {Promise<number>} Number of bytes read
   */
  async read(p) {
    const { bytesRead } = await this.stream.read(p, 0, p.length, this.stream.Position);
    this.stream.Position += bytesRead;
    return bytesRead;
  }

  /**
   * Sets the position of the stream according to whence.
   * @param {number} offset
   * @param {number} whence One of SEEK_SET, SEEK_CUR, SEEK_END
   * @returns {Promise<number>} New position
   */
  async seek(offset, whence) {
    switch (whence) {
      case SEEK_SET:
        this.stream.Position = offset >>> 0;
        break;
      case SEEK_CUR:
        this.stream.Position = (this.stream.Position + offset) >>> 0;
        break;
      case SEEK_END:
        this.stream.Position = (this.stream.Size - offset) >>> 0;
        break;
      default:
        throw new Error(`Invalid whence argument: ${whence}`);
    }
    return this.stream.Position;
  }

  /**
   * Closes the data stream
   */
  close() {
    this.stream = null;
  }
}

module.exports = { DataStream };
