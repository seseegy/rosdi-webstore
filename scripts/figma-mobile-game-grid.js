// Rebuild Siklus 75: grid game Beranda mobile -> layout vertikal seperti kode,
// 6 game lengkap + sub persis {publisher} · {tagline}; rambat ke latar modal.
// Dijalankan lewat use_figma; placeholder __FRAME__/__TOKENS__/__MODE__ diisi driver.
// MODE "full": 6 game, 3 baris (Beranda + latar modal S&K/Refund/Masuk).
// MODE "single": 1 kartu MLBB (frame pencarian "mlbb" — seksinya hanya 1 game).
// Geometri mengikuti index.css: .wrap padding 16; .sec-head h2 + margin-bottom 14
// (tinggi blok sec-head = max(h2, .more)); .grid.c4 -> 2 kolom di <=620px
// (kartu 173, gap 12); .card padding 14 radius 14; .tile 46;
// .p-name 14.5/600 margin 10 0 2; .p-sub 12.5; .p-from 13/600 margin-top 6;
// section.block margin 26 (jarak grid -> seksi berikut dipertahankan lewat shift).
const T = __TOKENS__;
const FRAME_ID = "__FRAME__";
const MODE = "__MODE__";

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

function rect(parent, name, x, y, w, h, fill, radius, stroke, strokeW) {
  const n = figma.createRectangle();
  n.name = name; n.x = x; n.y = y; n.resize(w, h);
  n.fills = fill ? solid(fill) : [];
  if (radius) n.cornerRadius = radius;
  if (stroke) { n.strokes = solid(stroke); n.strokeWeight = strokeW || 1; }
  parent.appendChild(n); return n;
}
async function txt(parent, name, x, y, str, size, weight, color, opts) {
  opts = opts || {};
  const n = figma.createText();
  n.name = name; n.x = x; n.y = y;
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.fills = solid(color); n.characters = str;
  if (opts.lineHeight) n.lineHeight = { unit: "PIXELS", value: opts.lineHeight };
  if (opts.align) n.textAlignHorizontal = opts.align;
  if (opts.width) { n.textAutoResize = "HEIGHT"; n.resize(opts.width, n.height); }
  parent.appendChild(n); return n;
}
async function centerTxt(parent, name, cx, cy, str, size, weight, color) {
  const n = await txt(parent, name, 0, 0, str, size, weight, color);
  n.textAutoResize = "WIDTH_AND_HEIGHT";
  n.x = cx - n.width / 2; n.y = cy - n.height / 2;
  return n;
}
async function measureH(str, size, weight, width) {
  const n = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.characters = str;
  n.textAutoResize = "HEIGHT"; n.resize(width, n.height);
  const h = n.height; n.remove(); return h;
}

// Isi persis src/data.js GAMES (name, initials, color, publisher, tagline, from).
const GAMES = [
  { name: "Mobile Legends", ini: "ML", color: "#2563eb", sub: "Moonton · Top up langsung ke akun", from: "Mulai Rp1.650" },
  { name: "Free Fire", ini: "FF", color: "#0284c7", sub: "Garena · Top up langsung ke akun", from: "Mulai Rp1.000" },
  { name: "Genshin Impact", ini: "GI", color: "#0f766e", sub: "HoYoverse · Via UID, pilih server", from: "Mulai Rp12.500" },
  { name: "PUBG Mobile", ini: "PB", color: "#334155", sub: "Level Infinite · Top up langsung ke akun", from: "Mulai Rp14.500" },
  { name: "Honor of Kings", ini: "HK", color: "#1e3a8a", sub: "TiMi Studio · Top up token langsung ke akun", from: "Mulai Rp1.500" },
  { name: "Roblox", ini: "RB", color: "#334155", sub: "Roblox Corporation · Gift card Robux, kode ke email", from: "Mulai Rp15.500" },
];
const LIST = MODE === "single" ? [GAMES[0]] : GAMES;
const ROWS = Math.ceil(LIST.length / 2);

const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const oldH = f.height;
const kids = [...f.children];
const veil = kids.find((c) => /veil/i.test(c.name));
// Tangkap simpul kartu modal SEBELUM membuat simpul baru (bug Siklus 68).
const afterVeilNodes = veil ? [...kids.slice(kids.indexOf(veil) + 1)] : [];
const bgKids = veil ? kids.slice(0, kids.indexOf(veil)) : kids;

const texts = f.findAllWithCriteria({ types: ["TEXT"] });
// AWAS: ada DUA teks "Top Up Game" — chip kategori (12.5px, y~305) dan h2 seksi
// (17px). Pilih h2 berdasarkan fontSize, bukan teks saja (bug builder v1: grid
// baru dibangun di y=351 menimpa kartu flash).
const secHeads = texts.filter((t) => t.characters === "Top Up Game" && Math.round(t.fontSize) === 17);
if (secHeads.length !== 1) return { error: "h2 Top Up Game bukan 1", count: secHeads.length, frame: FRAME_ID };
const secHead = secHeads[0];
if (secHead.y < 400) return { error: "h2 Top Up Game terlalu atas", y: Math.round(secHead.y), frame: FRAME_ID };
const more = texts.find((t) => (t.characters || "").startsWith("Harga mulai dari"));
if (!more) return { error: "teks .more tidak ditemukan", frame: FRAME_ID };
const nextHead = texts.find((t) => t.characters === (MODE === "single" ? "Kenapa Rosdi Store" : "Pulsa, Data, PLN & E-Wallet"));
if (!nextHead) return { error: "judul seksi berikut tidak ditemukan", frame: FRAME_ID };

// Kartu lama: rect 174x92 di antara sec-head dan seksi berikut.
const oldRects = bgKids.filter((c) => c.type === "RECTANGLE" && Math.round(c.width) === 174 && Math.round(c.height) === 92 && c.y > secHead.y + 30 && c.y < nextHead.y);
const expectRects = MODE === "single" ? 1 : 4;
const gridTop = secHead.y + Math.max(secHead.height, more.height) + 14;
let oldGridBottom, oldNodes;
if (oldRects.length === expectRects) {
  const oldTop = Math.min(...oldRects.map((c) => c.y));
  oldGridBottom = Math.max(...oldRects.map((c) => c.y + c.height));
  // Semua simpul latar di rentang grid lama = 6 simpul/kartu (rect + tile + inisial + nama + from + sub).
  oldNodes = bgKids.filter((c) => c.y >= oldTop - 1 && c.y < nextHead.y);
  const expectNodes = expectRects * 6;
  if (oldNodes.length !== expectNodes) return { error: "simpul grid lama bukan " + expectNodes, count: expectNodes, got: oldNodes.length, frame: FRAME_ID };
} else if (oldRects.length === 0) {
  // Jalur pulih: grid lama sudah terhapus (mis. repair pasca-build v1 yang salah
  // tempat). Tidak ada yang dihapus; dasar grid lama = judul seksi berikut − 28
  // (celah terukur di frame ini: 963 − 935).
  oldGridBottom = nextHead.y - 28;
  oldNodes = bgKids.filter((c) => c.y >= gridTop - 1 && c.y < nextHead.y);
  if (oldNodes.length !== 0) return { error: "rentang grid kosong bukan 0", count: oldNodes.length, frame: FRAME_ID };
} else {
  return { error: "rect kartu lama bukan " + expectRects, count: oldRects.length, frame: FRAME_ID };
}
// Simpul di bawah grid (termasuk judul seksi berikut) — digeser delta, ditangkap sebelum hapus.
const shiftList = bgKids.filter((c) => c.y >= nextHead.y);

// Ukur tinggi kartu (teks diukur dulu, bukan asumsi) — lebar teks 173-28=145.
const cardH = [];
for (const g of LIST) {
  const nameH = await measureH(g.name, 14.5, "SemiBold", 145);
  const subH = await measureH(g.sub, 12.5, "Regular", 145);
  const fromH = await measureH(g.from, 13, "SemiBold", 145);
  cardH.push(14 + 46 + 10 + nameH + 2 + subH + 6 + fromH + 14);
}
const rowH = [];
for (let r = 0; r < ROWS; r++) rowH.push(Math.max(cardH[r * 2], cardH[Math.min(r * 2 + 1, LIST.length - 1)]));
const newGridBottom = gridTop + rowH.reduce((a, b) => a + b, 0) + 12 * (ROWS - 1);
const delta = newGridBottom - oldGridBottom;

// Hapus kartu lama dulu, baru bangun (urutan aman: hapus -> buat).
for (const n of oldNodes) n.remove();

const created = [];
let gy = gridTop;
for (let r = 0; r < ROWS; r++) {
  for (let col = 0; col < 2; col++) {
    const i = r * 2 + col;
    if (i >= LIST.length) break;
    const g = LIST[i];
    const x = 16 + col * (173 + 12);
    const y = gy;
    const card = rect(f, g.name, x, y, 173, rowH[r], T.surface, 14, T.line, 1);
    created.push(card);
    const tile = rect(f, "Tile " + g.ini, x + 14, y + 14, 46, 46, g.color, 12);
    created.push(tile);
    created.push(await centerTxt(f, g.ini, x + 14 + 23, y + 14 + 23, g.ini, 15, "ExtraBold", "#FFFFFF"));
    const nameH = await measureH(g.name, 14.5, "SemiBold", 145);
    const subH = await measureH(g.sub, 12.5, "Regular", 145);
    created.push(await txt(f, g.name, x + 14, y + 14 + 46 + 10, g.name, 14.5, "SemiBold", T.ink, { width: 145 }));
    created.push(await txt(f, g.sub, x + 14, y + 14 + 46 + 10 + nameH + 2, g.sub, 12.5, "Regular", T.sub, { width: 145 }));
    created.push(await txt(f, g.from, x + 14, y + 14 + 46 + 10 + nameH + 2 + subH + 6, g.from, 13, "SemiBold", T.blue, { width: 145 }));
  }
  gy += rowH[r] + 12;
}

// Simpul di bawah grid geser delta; frame memanjang; veil + kartu modal ikut.
for (const n of shiftList) n.y += delta;
const newH = oldH + delta;
f.resize(390, newH);
if (veil) {
  veil.resize(390, newH);
  // Geser SELURUH kelompok modal (rect + isi) — bukan rect saja (pelajaran Siklus 69).
  for (const n of afterVeilNodes) n.y += delta / 2;
}
// Simpul baru harus di bawah veil (bukan menutupinya): pindah sebelum veil.
if (veil) {
  let idx = f.children.indexOf(veil);
  for (const n of created) { f.insertChild(idx, n); idx++; }
}
return {
  frame: f.name, mode: MODE, oldH: Math.round(oldH), newH: Math.round(newH),
  gridTop: Math.round(gridTop), oldGridBottom: Math.round(oldGridBottom),
  newGridBottom: Math.round(newGridBottom), delta: Math.round(delta),
  cardH: cardH.map((v) => Math.round(v)), rowH: rowH.map((v) => Math.round(v)),
  shifted: shiftList.length, created: created.length,
};
