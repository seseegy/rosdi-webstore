// Builder frame Figma "Indeks Pulsa/Data/E-Wallet — Mobile" Rosdi Store (390px).
// Dijalankan lewat use_figma; placeholder __NAME__/__X__/__Y__/__TOKENS__/__MODE__
// diisi driver sebelum dikirim. Token mengikuti sistem desain maraton.
// Isi mengikuti src/pages/PhonePages.jsx (OperatorIndex / EmoneyIndex) +
// src/data.js (OPERATORS, DATA_PACKAGES, EWALLETS, EMONEY_ITEMS) + index.css:
// header situs mobile (logo + Masuk, nav disembunyikan <=620px), crumb
// (tombol kembali 38px + h1 19px + sub 12.5px), grid .c3 -> 2 kolom di
// <=620px (kartu 173px, gap 12), kartu .card (tile 46, p-name 14.5,
// p-sub 12.5, p-from 13 biru, padding 14, radius 14).
// Tinggi kartu & crumb diukur dari teks (sub bisa 2 baris di lebar 145px).
// Mode pulsa: 6 operator, sub "Pulsa reguler semua nominal", Dari = harga
// pulsa termurah tiap operator. Mode data: 6 operator, sub "N paket tersedia",
// Dari = harga paket termurah tiap operator. Mode emoney: 4 wallet, sub
// "Ke nomor HP yang terdaftar di aplikasi", Dari = Rp10.292 (EMONEY_ITEMS[0]).
const T = __TOKENS__;
const FRAME_NAME = "__NAME__";
const FX = __X__;
const FY = __Y__;
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
  if (opts.letterSpacing) n.letterSpacing = { unit: "PIXELS", value: opts.letterSpacing };
  if (opts.align) n.textAlignHorizontal = opts.align;
  if (opts.width) { n.textAutoResize = "HEIGHT"; n.resize(opts.width, n.height); }
  parent.appendChild(n); return n;
}
async function centerTxt(parent, name, cx, cy, str, size, weight, color) {
  const n = await txt(parent, name, 0, 0, str, size, weight, color);
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

const DATA = {
  pulsa: {
    title: "Pulsa Reguler",
    sub: "Pilih operator — atau langsung isi nomor, operator terdeteksi otomatis",
    items: [
      { name: "Telkomsel", ini: "TS", color: "#DC2626", sub: "Pulsa reguler semua nominal", from: "Dari Rp6.500" },
      { name: "Indosat", ini: "IS", color: "#B45309", sub: "Pulsa reguler semua nominal", from: "Dari Rp6.300" },
      { name: "XL", ini: "XL", color: "#2563EB", sub: "Pulsa reguler semua nominal", from: "Dari Rp6.400" },
      { name: "Axis", ini: "AX", color: "#7C3AED", sub: "Pulsa reguler semua nominal", from: "Dari Rp5.900" },
      { name: "Tri", ini: "3", color: "#0F766E", sub: "Pulsa reguler semua nominal", from: "Dari Rp5.800" },
      { name: "Smartfren", ini: "SF", color: "#BE185D", sub: "Pulsa reguler semua nominal", from: "Dari Rp6.000" },
    ],
  },
  data: {
    title: "Paket Data",
    sub: "Pilih operator — atau langsung isi nomor, operator terdeteksi otomatis",
    items: [
      { name: "Telkomsel", ini: "TS", color: "#DC2626", sub: "5 paket tersedia", from: "Dari Rp24.000" },
      { name: "Indosat", ini: "IS", color: "#B45309", sub: "3 paket tersedia", from: "Dari Rp23.000" },
      { name: "XL", ini: "XL", color: "#2563EB", sub: "3 paket tersedia", from: "Dari Rp12.000" },
      { name: "Axis", ini: "AX", color: "#7C3AED", sub: "3 paket tersedia", from: "Dari Rp26.000" },
      { name: "Tri", ini: "3", color: "#0F766E", sub: "3 paket tersedia", from: "Dari Rp28.000" },
      { name: "Smartfren", ini: "SF", color: "#BE185D", sub: "3 paket tersedia", from: "Dari Rp24.000" },
    ],
  },
  emoney: {
    title: "Isi Saldo E-Wallet",
    sub: "Admin sudah termasuk di harga yang tampil",
    items: [
      { name: "Saldo DANA", ini: "DN", color: "#2563EB", sub: "Ke nomor HP yang terdaftar di aplikasi", from: "Dari Rp10.292" },
      { name: "Saldo GoPay", ini: "GP", color: "#0F766E", sub: "Ke nomor HP yang terdaftar di aplikasi", from: "Dari Rp10.292" },
      { name: "Saldo OVO", ini: "OV", color: "#4C1D95", sub: "Ke nomor HP yang terdaftar di aplikasi", from: "Dari Rp10.292" },
      { name: "Saldo ShopeePay", ini: "SP", color: "#C2410C", sub: "Ke nomor HP yang terdaftar di aplikasi", from: "Dari Rp10.292" },
    ],
  },
  // Siklus 130 — Pascabayar (Tahap 5): 7 kategori tagihan, Dari = billItem
  // (tagihan contoh + admin Rp2.500) dari src/data.js BILLS; urutan = BILLS.
  tagihan: {
    title: "Tagihan Pascabayar",
    sub: "Cek & bayar tagihan bulanan — pilih kategori",
    items: [
      { name: "PLN Pascabayar", ini: "LN", color: "#0F766E", sub: "Listrik pascabayar bulanan", from: "Dari Rp189.900" },
      { name: "PDAM", ini: "PD", color: "#0284C7", sub: "Air bersih bulanan", from: "Dari Rp89.000" },
      { name: "BPJS Kesehatan", ini: "BP", color: "#1E3A8A", sub: "Iuran kesehatan bulanan", from: "Dari Rp107.500" },
      { name: "Telkom / IndiHome", ini: "TI", color: "#DC2626", sub: "Internet & telepon rumah", from: "Dari Rp277.500" },
      { name: "TV Kabel", ini: "TV", color: "#7C3AED", sub: "Langganan TV bulanan", from: "Dari Rp151.500" },
      { name: "Multifinance", ini: "MF", color: "#B45309", sub: "Cicilan kendaraan & barang", from: "Dari Rp1.252.500" },
      { name: "PBB", ini: "PB", color: "#475569", sub: "Pajak bumi dan bangunan", from: "Dari Rp127.500" },
    ],
  },
}[MODE];

// ---- ukur tinggi teks dulu (nama/sub/from di lebar kartu, sub crumb) ----
const CARDW = 173, PAD = 14, TEXTW = CARDW - PAD * 2;
const cardH = [];
for (const o of DATA.items) {
  const nh = await measureH(o.name, 14.5, "Semi Bold", TEXTW);
  const sh = await measureH(o.sub, 12.5, "Regular", TEXTW);
  const fh = await measureH(o.from, 13, "Semi Bold", TEXTW);
  cardH.push(Math.ceil(PAD + 46 + 10 + nh + 2 + sh + 6 + fh + PAD));
}
const h1H = await measureH(DATA.title, 19, "Bold", 308);
const subH = await measureH(DATA.sub, 12.5, "Regular", 308);
const crumbH = Math.max(38, Math.ceil(h1H + 1 + subH));
const gridY = 64 + 18 + crumbH + 14;
const rows = Math.ceil(DATA.items.length / 2);
let gridBottom = gridY;
for (let r = 0; r < rows; r++) gridBottom += Math.max(cardH[r * 2], cardH[r * 2 + 1] || 0) + (r < rows - 1 ? 12 : 0);
const FRAME_H = Math.ceil(gridBottom + 16);

const frame = figma.createFrame();
frame.name = FRAME_NAME;
frame.x = FX; frame.y = FY;
frame.resize(390, FRAME_H);
frame.fills = solid(T.bg);
frame.clipsContent = false;
figma.currentPage.appendChild(frame);

// ---- Header situs mobile (64) — logo + Masuk, tanpa nav (<=620px) ----
rect(frame, "HeaderBg", 0, 0, 390, 64, T.surface, 0);
rect(frame, "LogoMark", 16, 14, 36, 36, T.blue, 10);
await centerTxt(frame, "LogoR", 34, 32, "R", 18, "Extra Bold", "#FFFFFF");
await txt(frame, "LogoName", 60, 17, "Rosdi Store", 17, "Extra Bold", T.ink);
await txt(frame, "LogoTag", 60, 37, "Top up instan 24 jam", 10.5, "Medium", T.sub);
rect(frame, "MasukBtn", 306, 16, 68, 32, T.blue, 10);
await centerTxt(frame, "MasukText", 340, 32, "Masuk", 14, "Semi Bold", "#FFFFFF");

// ---- Crumb (y 82) — tombol kembali 38px + h1 + sub ----
const crumbY = 82;
rect(frame, "BackBtn", 16, crumbY, 38, 38, T.surface, 10, T.line);
await centerTxt(frame, "BackIcon", 35, crumbY + 19, "‹", 17, "Regular", T.ink);
await txt(frame, "CrumbTitle", 66, crumbY, DATA.title, 19, "Bold", T.ink, { letterSpacing: -0.2, width: 308 });
await txt(frame, "CrumbSub", 66, crumbY + h1H + 1, DATA.sub, 12.5, "Regular", T.sub, { width: 308, lineHeight: 16 });

// ---- Grid operator (2 kolom, kartu 173, gap 12) ----
{
  let gy = gridY;
  for (let r = 0; r < rows; r++) {
    const rh = Math.max(cardH[r * 2], cardH[r * 2 + 1] || 0);
    for (let c = 0; c < 2; c++) {
      const i = r * 2 + c;
      if (i >= DATA.items.length) break;
      const o = DATA.items[i];
      const cx = 16 + c * (CARDW + 12);
      rect(frame, "Card " + o.name, cx, gy, CARDW, rh, T.surface, 14, T.line);
      rect(frame, "Tile " + o.ini, cx + PAD, gy + PAD, 46, 46, o.color, 12);
      await centerTxt(frame, "TileText " + o.ini, cx + PAD + 23, gy + PAD + 23, o.ini, 15, "Extra Bold", "#FFFFFF");
      const nm = await txt(frame, "Name " + o.name, cx + PAD, gy + PAD + 46 + 10, o.name, 14.5, "Semi Bold", T.ink, { width: TEXTW });
      const sb = await txt(frame, "Sub " + o.name, cx + PAD, gy + PAD + 46 + 10 + nm.height + 2, o.sub, 12.5, "Regular", T.sub, { width: TEXTW, lineHeight: 16 });
      await txt(frame, "From " + o.name, cx + PAD, gy + PAD + 46 + 10 + nm.height + 2 + sb.height + 6, o.from, 13, "Semi Bold", T.blue, { width: TEXTW });
    }
    gy += rh + 12;
  }
}

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, mode: MODE, cards: DATA.items.length, cardH, crumbH, gridY, gridBottom };
