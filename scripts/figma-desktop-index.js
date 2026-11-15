// Builder frame Figma "Indeks Pulsa/Data/E-Wallet — Desktop" Rosdi Store (1280px).
// Dijalankan lewat use_figma; placeholder __NAME__/__X__/__Y__/__TOKENS__/__MODE__
// diisi driver sebelum dikirim. Token mengikuti sistem desain maraton.
// Isi mengikuti src/pages/PhonePages.jsx (OperatorIndex / EmoneyIndex) +
// src/data.js (OPERATORS, DATA_PACKAGES, EWALLETS, EMONEY_ITEMS).
// Mode pulsa: 6 operator, sub "Pulsa reguler semua nominal", Dari = harga
// pulsa termurah tiap operator. Mode data: 6 operator, sub "N paket tersedia",
// Dari = harga paket termurah tiap operator. Mode emoney: 4 wallet, sub
// "Ke nomor HP yang terdaftar di aplikasi", Dari = Rp10.292 (EMONEY_ITEMS[0]).
// Header tanpa nav aktif (route indeks bukan home/cek — Header.jsx).
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
function tile(parent, x, y, size, ini, color) {
  rect(parent, "Tile " + ini, x, y, size, size, color, 12);
  return centerTxt(parent, "TileText " + ini, x + size / 2, y + size / 2, ini, 15, "Extra Bold", "#FFFFFF");
}
async function opCard(parent, x, y, w, o) {
  rect(parent, "Card " + o.name, x, y, w, 140, T.surface, 14, T.line);
  await tile(parent, x + 14, y + 14, 46, o.ini, o.color);
  await txt(parent, "Name " + o.name, x + 14, y + 72, o.name, 14.5, "Semi Bold", T.ink);
  await txt(parent, "Sub " + o.name, x + 14, y + 93, o.sub, 12.5, "Regular", T.sub);
  await txt(parent, "From " + o.name, x + 14, y + 112, o.from, 13, "Semi Bold", T.blue);
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

const frame = figma.createFrame();
frame.name = FRAME_NAME;
frame.x = FX; frame.y = FY;
frame.resize(1280, 700);
frame.fills = solid(T.bg);
frame.clipsContent = false;
figma.currentPage.appendChild(frame);

// ---- Header (62) — tanpa nav aktif ----
rect(frame, "HeaderBg", 0, 0, 1280, 62, T.surface, 0);
rect(frame, "HeaderLine", 0, 62, 1280, 1, T.line, 0);
rect(frame, "LogoMark", 80, 13, 36, 36, T.blue, 10);
await centerTxt(frame, "LogoR", 98, 31, "R", 18, "Extra Bold", "#FFFFFF");
await txt(frame, "LogoName", 126, 15, "Rosdi Store", 17, "Extra Bold", T.ink);
await txt(frame, "LogoTag", 126, 37, "Top up instan 24 jam", 10.5, "Medium", T.sub);
await txt(frame, "NavBeranda", 338, 22, "Beranda", 13.5, "Medium", T.sub);
await txt(frame, "NavCek", 418, 22, "Cek Transaksi", 13.5, "Medium", T.sub);
rect(frame, "ThemeBtn", 1072, 12, 38, 38, T.surface, 10, T.line);
await centerTxt(frame, "ThemeIcon", 1091, 31, "☾", 16, "Regular", T.sub);
rect(frame, "MasukBtn", 1118, 12, 82, 38, T.blue, 11);
await centerTxt(frame, "MasukText", 1159, 31, "Masuk", 14, "Semi Bold", "#FFFFFF");

// ---- Crumb (y 86) — tanpa tile, sesuai OperatorIndex/EmoneyIndex ----
rect(frame, "BackBtn", 80, 88, 34, 34, T.surface, 9, T.line);
await centerTxt(frame, "BackIcon", 97, 105, "‹", 18, "Regular", T.sub);
await txt(frame, "CrumbTitle", 126, 86, DATA.title, 20, "Bold", T.ink, { letterSpacing: -0.2 });
await txt(frame, "CrumbSub", 126, 110, DATA.sub, 13, "Regular", T.sub);

// ---- Grid operator (3 kolom, kartu 362×140, gap 16/17) ----
{
  const cw = 362, cg = 17, rg = 16, gy = 158;
  for (let i = 0; i < DATA.items.length; i++) {
    const cx = 80 + (i % 3) * (cw + cg);
    const cy = gy + Math.floor(i / 3) * (140 + rg);
    await opCard(frame, cx, cy, cw, DATA.items[i]);
  }
}
const gridBottom = 158 + Math.ceil(DATA.items.length / 3) * 140 + (Math.ceil(DATA.items.length / 3) - 1) * 16;

// ---- Footer (y = gridBottom + 40) ----
{
  const fy = gridBottom + 40;
  rect(frame, "FooterBg", 0, fy, 1280, 210, T.surface, 0);
  rect(frame, "FooterLine", 0, fy, 1280, 1, T.line, 0);
  rect(frame, "FootLogoMark", 80, fy + 30, 36, 36, T.blue, 10);
  await centerTxt(frame, "FootLogoR", 98, fy + 48, "R", 18, "Extra Bold", "#FFFFFF");
  await txt(frame, "FootLogoName", 126, fy + 36, "Rosdi Store", 17, "Extra Bold", T.ink);
  await txt(frame, "FootDesc", 80, fy + 78, "Toko top up game, pulsa, paket data, token PLN, dan e-wallet dengan harga yang ditampilkan apa adanya sejak awal — termasuk biaya tiap metode pembayaran.", 12.5, "Regular", T.sub, { width: 340, lineHeight: 19 });
  await txt(frame, "FootHProduk", 500, fy + 30, "Produk", 13.5, "Bold", T.ink);
  const links = ["Mobile Legends", "Free Fire", "Pulsa Reguler", "Token PLN"];
  for (let i = 0; i < links.length; i++) await txt(frame, "FootProduk " + links[i], 500, fy + 54 + i * 24, links[i], 12.5, "Regular", T.sub);
  await txt(frame, "FootHBantuan", 700, fy + 30, "Bantuan", 13.5, "Bold", T.ink);
  const help = ["Cek Transaksi", "Cara Top Up", "Syarat & Ketentuan", "Kebijakan Pengembalian"];
  for (let i = 0; i < help.length; i++) await txt(frame, "FootBantuan " + help[i], 700, fy + 54 + i * 24, help[i], 12.5, "Regular", T.sub);
  await txt(frame, "FootHPay", 940, fy + 30, "Pembayaran", 13.5, "Bold", T.ink);
  const chips = ["QRIS", "GoPay", "DANA", "OVO", "ShopeePay", "BCA", "Mandiri", "BRI", "Alfamart", "Indomaret", "Pulsa"];
  let cx = 940, cy = fy + 54;
  for (const p of chips) {
    const w = Math.round(p.length * 6.6 + 18);
    if (cx + w > 1200) { cx = 940; cy += 30; }
    rect(frame, "PayChip " + p, cx, cy, w, 24, T.surface, 7, T.line);
    await centerTxt(frame, "PayChipText " + p, cx + w / 2, cy + 12, p, 11, "Semi Bold", T.sub);
    cx += w + 6;
  }
  rect(frame, "CopyrightLine", 80, fy + 170, 1120, 1, T.line, 0);
  await txt(frame, "Copyright", 80, fy + 184, "© 2026 Rosdi Store · Harga diperbarui mengikuti katalog pemasok dan dapat berubah sewaktu-waktu.", 12, "Regular", T.faint);
  frame.resize(1280, fy + 210);
}

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, mode: MODE, cards: DATA.items.length, gridBottom };
