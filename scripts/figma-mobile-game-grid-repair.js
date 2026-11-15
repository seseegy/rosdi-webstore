// Repair Siklus 75: pulihkan frame Beranda Light (1:2) dari build grid yang salah
// tempat (builder v1 memakai chip "Top Up Game" y=305 sebagai sec-head).
// 1) Hapus 36 simpul grid baru yang salah tempat (geometri eksak dari build v1).
// 2) Kembalikan geser -77 pada simpul di bawah seksi berikut (+77) + tinggi frame.
// Dijalankan lewat use_figma; placeholder __FRAME__/__SHIFT__/__OLDH__ diisi driver.
const FRAME_ID = "__FRAME__";
const SHIFT = __SHIFT__; // +77
const OLDH = __OLDH__;   // 2344

const GAMES = ["Mobile Legends", "Free Fire", "Genshin Impact", "PUBG Mobile", "Honor of Kings", "Roblox"];
const INI = ["ML", "FF", "GI", "PB", "HK", "RB"];

const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
if (Math.round(f.height) !== OLDH + -SHIFT) return { error: "tinggi frame bukan harapan", h: Math.round(f.height), expect: OLDH - SHIFT };
const kids = [...f.children];
const wrong = [];
for (const n of kids) {
  const x = Math.round(n.x), y = Math.round(n.y), w = Math.round(n.width);
  const ch = n.type === "TEXT" ? (n.characters || "") : "";
  let hit = false;
  if (n.type === "RECTANGLE" && GAMES.includes(n.name) && w === 173 && [351, 519, 687].includes(y)) hit = true;
  if (n.type === "RECTANGLE" && /^Tile /.test(n.name) && w === 46 && [365, 533, 701].includes(y)) hit = true;
  if (n.type === "TEXT" && INI.includes(ch) && w <= 23 && [379, 547, 715].includes(y)) hit = true;
  if (n.type === "TEXT" && GAMES.includes(ch) && (x === 30 || x === 215) && w === 145 && [421, 589, 757].includes(y)) hit = true;
  if (n.type === "TEXT" && /^(Moonton|Garena|HoYoverse|Level Infinite|TiMi Studio|Roblox Corporation) · /.test(ch) && w === 145 && [441, 609, 777].includes(y)) hit = true;
  if (n.type === "TEXT" && /^Mulai Rp/.test(ch) && w === 145 && [477, 645, 813, 828].includes(y)) hit = true;
  if (hit) wrong.push(n);
}
if (wrong.length !== 36) return { error: "simpul salah bukan 36", count: wrong.length, frame: FRAME_ID };
for (const n of wrong) n.remove();

// Simpul di bawah seksi berikut (judul kini di 886) digeser kembali +SHIFT.
const texts = f.findAllWithCriteria({ types: ["TEXT"] });
const nextHead = texts.find((t) => t.characters === "Pulsa, Data, PLN & E-Wallet");
if (!nextHead) return { error: "judul seksi berikut tidak ditemukan", frame: FRAME_ID };
const below = [...f.children].filter((c) => c.y >= nextHead.y - 1);
if (below.length !== 82) return { error: "simpul bawah bukan 82", count: below.length, frame: FRAME_ID };
for (const n of below) n.y += SHIFT;
f.resize(390, OLDH);
return { frame: f.name, removed: wrong.length, shiftedBack: below.length, h: Math.round(f.height), nextHeadY: Math.round(nextHead.y) };
