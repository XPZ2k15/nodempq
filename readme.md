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

### Output Example

```terminal
Archive size: 269191614
Files in archive: [
  'binkw32.dll',
  'Bnclient.dll',
  'D2Client.dll',
  'D2CMP.dll',
  'D2Common.dll',
  'D2DDraw.dll',
  'D2Direct3D.dll',
  'D2Game.dll',
  'D2Gdi.dll',
  'D2gfx.dll',
  'D2Glide.dll',
  'D2Lang.dll',
  'D2Launch.dll',
  'D2MCPClient.dll',
  'D2Multi.dll',
  'D2Net.dll',
  'D2sound.dll',
  'D2VidTst.exe',
  'D2Win.dll',
  'data\\global\\AnimData.D2',
  'data\\global\\chars_cof.d2',
  'data\\global\\cmncof_a1.d2',
  'data\\global\\cmncof_a2.d2',
  'data\\global\\cmncof_a3.d2',
  'data\\global\\cmncof_a4.d2',
  'data\\global\\cmncof_a5.d2',
  'data\\global\\cmncof_a6.d2',
  'data\\global\\cmncof_a7.d2',
  'data\\global\\excel\\Aiparms.txt',
  'data\\global\\excel\\Arena.txt',
  'data\\global\\excel\\armor.txt',
  'data\\global\\excel\\ArmType.txt',
  'data\\global\\excel\\AutoMap.txt',
  'data\\global\\excel\\belts.txt',
  'data\\global\\excel\\books.txt',
  'data\\global\\excel\\charstats.txt',
  'data\\global\\excel\\CharTemplate.txt',
  'data\\global\\excel\\Composit.txt',
  'data\\global\\excel\\difficultylevels.txt',
  'data\\global\\excel\\experience.txt',
  'data\\global\\excel\\gamble.txt',
  'data\\global\\excel\\gems.txt',
  'data\\global\\excel\\inventory.txt',
  'data\\global\\excel\\itemratio.txt',
  'data\\global\\excel\\ItemStatCost.txt',
  'data\\global\\excel\\Levels.txt',
  'data\\global\\excel\\lowqualityitems.txt',
  'data\\global\\excel\\LvlMaze.txt',
  'data\\global\\excel\\LvlPrest.txt',
  'data\\global\\excel\\LvlSub.txt',
  'data\\global\\excel\\LvlTypes.txt',
  'data\\global\\excel\\LvlWarp.txt',
  'data\\global\\excel\\MagicPrefix.txt',
  'data\\global\\excel\\MagicSuffix.txt',
  'data\\global\\excel\\misc.txt',
  'data\\global\\excel\\Missiles.txt',
  'data\\global\\excel\\MonItemPercent.txt',
  'data\\global\\excel\\MonMode.txt',
  'data\\global\\excel\\MonName.txt',
  'data\\global\\excel\\monstats.txt',
  'data\\global\\excel\\MonType.txt',
  'data\\global\\excel\\objects.txt',
  'data\\global\\excel\\objgroup.txt',
  'data\\global\\excel\\ObjMode.txt',
  'data\\global\\excel\\ObjType.txt',
  'data\\global\\excel\\Overlay.txt',
  'data\\global\\excel\\PlrMode.txt',
  'data\\global\\excel\\PlrType.txt',
  'data\\global\\excel\\qualityitems.txt',
  'data\\global\\excel\\RarePrefix.txt',
  'data\\global\\excel\\RareSuffix.txt',
  'data\\global\\excel\\SetItems.txt',
  'data\\global\\excel\\shrines.txt',
  'data\\global\\excel\\skills.txt',
  'data\\global\\excel\\SoundEnviron.txt',
  'data\\global\\excel\\Sounds.txt',
  'data\\global\\excel\\SuperUniques.txt',
  'data\\global\\excel\\TreasureClass.txt',
  'data\\global\\excel\\UniqueAppellation.txt',
  'data\\global\\excel\\UniqueItems.txt',
  'data\\global\\excel\\UniquePrefix.txt',
  'data\\global\\excel\\UniqueSuffix.txt',
  'data\\global\\excel\\UniqueTitle.txt',
  'data\\global\\excel\\weapons.txt',
  'data\\global\\ExpField.D2',
  'data\\global\\items\\fkpskp.DC6',
  'data\\global\\items\\flp2ax.dc6',
  'data\\global\\items\\flpaar.dc6',
  'data\\global\\items\\flpaxe.DC6',
  'data\\global\\items\\flpbar.DC6',
  'data\\global\\items\\flpbbk.DC6',
  'data\\global\\items\\flpbkf.dc6',
  'data\\global\\items\\flpbld.dc6',
  'data\\global\\items\\flpblt.DC6',
  'data\\global\\items\\flpblu.DC6',
  ... 10742 more items
]
Contents: Arena Suicide PlayerKill      PlayerKillPercent       MonsterKill     PlayerDeath     PlayerDeathPercent      MonsterDeath
Deathmatch      -6      2       10      1       -2      -10     -1

First 128 bytes: <Buffer 41 72 65 6e 61 09 53 75 69 63 69 64 65 09 50 6c 61 79 65 72 4b 69 6c 6c 09 50 6c 61 79 65 72 4b 69 6c 6c 50 65 72 63 65 6e 74 09 4d 6f 6e 73 74 65 72 ... 78 more bytes>
```

## 📝 License

MIT © 2025 XPZ2K15
