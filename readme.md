# D2Web MPQ Reader / Extractor

A tiny, dependency‑light Node.js library that lets you **open, list and extract files** from Blizzard‐style MPQ archives (as used by Diablo II and other classic titles).

> **Status:** experimental – APIs may change while things settle. Tested with Diablo II 1.14d MPQs

---

## ✨ Features

- Open an archive header‑only (`MPQ.New`) **or** fully parse the hash / block tables (`MPQ.FromFile`).
- List every file inside the archive with `mpq.listfile()`.
- Read whole files into a `Buffer` (`mpq.readFile`) or lazily as a stream (`mpq.readFileStream`).
- Transparent handling of –
  - PKWARE DCL ("explode")
  - zlib / deflate
  - ADPCM WAV audio blocks
  - Blizzard file encryption / sector tables
- Zero native addons – pure JS.

---

## 📁 Project Layout

```
nodempq/
├─ mpq/              ← Core MPQ parsers & helpers
│  ├─ block.js
│  ├─ crypto.js
│  ├─ hash.js
│  ├─ header.js
│  └─ mpq.js
│
├─ stream/           ← Low‑level sector & convenience data streams
│  ├─ stream.js
│  └─ data_stream.js
│
├─ example.js        ← Quick demo: list archive & read a file
├─ package.json
└─ package‑lock.json
```

If you want to consume this as a package, treat ``as the public entry point (or re‑export it from`src/index.js` in your own project).

---

## 🚀 Quick Start

```bash
# 1. install (local dev checkout)
$ git clone https://github.com/XPZ2k15/nodempq.git && cd D2WEB
$ npm install

# 2. run the demo (edit the path to your .mpq)
$ node example "C:/Program Files (x86)/Diablo II/d2data.mpq"
```

### Programmatic usage

```js
import { MPQ } from './mpq/mpq.js'; // or:  import { MPQ } from "d2web";

const mpq = await MPQ.FromFile('d2data.mpq');

console.log(await mpq.listfile()); // → array of file names

const buf = await mpq.readFile('data/global/excel/Arena.txt');
console.log(buf.toString());

// Streaming read (fs‑style)
const ds = await mpq.readFileStream('data/global/AnimData.D2');
const chunk = Buffer.alloc(1024);
const n = await ds.read(chunk);
console.log('first KB:', chunk.slice(0, n));
```

---

## 🛠️ Scripts

| NPM script      | What it does                                  |
| --------------- | --------------------------------------------- |
| `npm run start` | Runs the Example: Please provide your own MPQ |

---

## 📝 License

MIT © 2025 XPZ2K15
