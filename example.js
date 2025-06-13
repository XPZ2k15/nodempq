// example.js
const { MPQ } = require('./mpq/mpq');

async function main() {
  const filePath = 'C:/Program Files (x86)/Diablo II/d2data.mpq';

  // Option A: just read the header
  let mpq;
  try {
    mpq = await MPQ.New(filePath);
    console.log('Archive size:', mpq.size());
  } catch (err) {
    console.error('Error opening header-only:', err);
  } finally {
    if (mpq) await mpq.close();
  }

  // Option B: fully load hashes & blocks, then read a file
  try {
    mpq = await MPQ.FromFile(filePath);
    console.log('Files in archive:', await mpq.listfile());

    // Read a specific file into a Buffer
    const buf = await mpq.readFile('data\\global\\excel\\Arena.txt'); // exact path
    console.log('Contents:', buf.toString('utf8'));

    // Or stream it:
    const ds = await mpq.readFileStream('data\\global\\excel\\Arena.txt');
    const chunk = Buffer.alloc(128);
    const n = await ds.read(chunk);
    console.log('First 128 bytes:', chunk.slice(0, n));
  } catch (err) {
    console.error('Error loading/reading MPQ:', err);
  } finally {
    if (mpq) await mpq.close();
  }
}

main().catch(console.error);
