// Builder frame Figma "Sukses — Token PLN — Desktop" Rosdi Store (1280px).
// Dijalankan lewat use_figma; placeholder __NAME__/__X__/__Y__/__TOKENS__
// diisi driver sebelum dikirim. Token mengikuti sistem desain maraton.
// Isi mengikuti src/pages/InfoPages.jsx (SuccessPage: blok token bila
// order.token) + src/lib.js (genToken: 20 digit per 4) + src/index.css
// (.token-box: field, border dashed biru 1.5px, radius 12, 19px/800/0.14em)
// + src/data.js (Token PLN 100.000 = Rp102.500, QRIS tanpa biaya).
// Pasangan desktop dari frame mobile "Sukses — Token PLN" (77:2/77:34,
// Siklus 33): order contoh yang sama — ref RSD-X8K2P4, Token PLN
// 100.000, tujuan 543210987654, QRIS, total Rp102.500, token demo
// "1234 5678 9012 3456 7890", status "Selesai. Token PLN kamu sudah
// terbit." (wording sama seperti frame mobile; sub generik di kode
// berbunyi "Item sedang dikirim ke tujuanmu…" — untuk PLN tokennya
// sudah terbit, jadi wording spesifik ini yang dipakai pasangan mobile).
// Geometri mengikuti scripts/figma-desktop-sukses.js (kartu 640
// terpusat x=320, header 62, footer 210); blok token disisipkan antara
// status dan baris rincian, tinggi catatan token diukur dulu baru
// baris rincian dihitung (pola figma-mobile-sukses-pln.js).
const T = __TOKENS__;
const FRAME_NAME = "__NAME__";
const FX = __X__;
const FY = __Y__;

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
function ellipse(parent, name, x, y, w, h, fill) {
  const n = figma.createEllipse();
  n.name = name; n.x = x; n.y = y; n.resize(w, h);
  n.fills = fill ? solid(fill) : [];
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

const frame = figma.createFrame();
frame.name = FRAME_NAME;
frame.x = FX; frame.y = FY;
frame.resize(1280, 1200);
frame.fills = solid(T.bg);
frame.clipsContent = false;
figma.currentPage.appendChild(frame);

// ---- Header (62) — di halaman Sukses tidak ada nav aktif ----
rect(frame, "HeaderBg", 0, 0, 1280, 62, T.surface, 0);
rect(frame, "HeaderLine", 0, 62, 1280, 1, T.line, 0);
rect(frame, "LogoMark", 80, 13, 36, 36, T.blue, 10);
await centerTxt(frame, "LogoR", 98, 31, "R", 18, "Extra Bold", "#FFFFFF");
await txt(frame, "LogoName", 126, 15, "Rosdi Store", 17, "Extra Bold", T.ink);
await txt(frame, "LogoTag", 126, 37, "Top up instan 24 jam", 10.5, "Medium", T.sub);
await txt(frame, "NavBeranda", 330, 22, "Beranda", 13.5, "Medium", T.sub);
await txt(frame, "NavCek", 406, 22, "Cek Transaksi", 13.5, "Medium", T.sub);
rect(frame, "ThemeBtn", 1072, 12, 38, 38, T.surface, 10, T.line);
await centerTxt(frame, "ThemeIcon", 1091, 31, "☾", 16, "Regular", T.sub);
rect(frame, "MasukBtn", 1118, 12, 82, 38, T.blue, 11);
await centerTxt(frame, "MasukText", 1159, 31, "Masuk", 14, "Semi Bold", "#FFFFFF");

// ---- Kartu sukses (y 158, x 320 w 640) ----
const CX = 320, CW = 640;
const y = 158;
rect(frame, "SuccessCard", CX, y, CW, 560, T.surface, 14, T.line);
// .big-check: lingkaran 64 hijau-lembut, ✓ 30px
ellipse(frame, "BigCheck", CX + 288, y + 24, 64, 64, T.greenSoft);
await centerTxt(frame, "BigCheckMark", CX + 320, y + 56, "✓", 30, "Extra Bold", T.green);
// Judul + sub (rata tengah)
await centerTxt(frame, "SuccessTitle", CX + 320, y + 112, "Pesanan diterima", 20, "Bold", T.ink);
await txt(frame, "SuccessSub", CX + 40, y + 132, "Status: Selesai. Token PLN kamu sudah terbit.", 12.5, "Regular", T.sub, { width: 560, lineHeight: 19, align: "CENTER" });

// ---- Blok token (label + kotak dashed + catatan) ----
const NOTE_STR = "Masukkan 20 digit ini ke meteran. Token juga dicatat di riwayat perangkat ini.";
const noteH = await measureH(NOTE_STR, 12.5, "Regular", 604);
const LABEL_Y = y + 168, BOX_Y = y + 188, BOX_H = 52, NOTE_Y = y + 248;
await txt(frame, "TokenLabel", CX + 18, LABEL_Y, "Nomor token PLN kamu", 12, "SemiBold", T.sub, { width: 604 });
const box = figma.createRectangle();
box.name = "TokenBox"; box.x = CX + 18; box.y = BOX_Y;
box.resize(604, BOX_H);
box.fills = solid(T.field);
box.strokes = solid(T.blue);
box.strokeWeight = 1.5;
try { box.dashPattern = [5, 4]; } catch { /* dash tidak didukung di env ini */ }
box.cornerRadius = 12;
frame.appendChild(box);
const token = await txt(frame, "TokenValue", 0, 0, "1234 5678 9012 3456 7890", 19, "ExtraBold", T.blue, { letterSpacing: 2.66 });
token.x = CX + 320 - token.width / 2;
token.y = BOX_Y + BOX_H / 2 - token.height / 2;
await txt(frame, "TokenNote", CX + 18, NOTE_Y, NOTE_STR, 12.5, "Regular", T.sub, { width: 604 });

// ---- Rincian (5 baris: tanpa "Bukti dikirim ke" — order contoh tanpa email/WA, sama seperti frame mobile) ----
const rows = [
  ["Nomor transaksi", "RSD-X8K2P4"],
  ["Produk", "Token PLN — Token 100.000"],
  ["Tujuan", "543210987654"],
  ["Pembayaran", "QRIS"],
  ["Harga + biaya", "Rp102.500 + Rp0"],
];
let ry = NOTE_Y + Math.ceil(noteH) + 12;
for (const [lab, val] of rows) {
  await txt(frame, "SumLab " + lab, CX + 18, ry, lab, 13.5, "Regular", T.sub);
  await txt(frame, "SumVal " + lab, CX + CW - 18 - 300, ry, val, 13.5, "Semi Bold", T.ink, { width: 300, align: "RIGHT" });
  ry += 30;
}
// sum-total: garis + Total dibayar Rp102.500 (19px biru, kode .sum-total)
rect(frame, "SumDivider", CX + 18, ry + 10, CW - 36, 1, T.line, 0);
await txt(frame, "SumTotalLab", CX + 18, ry + 22, "Total dibayar", 14, "Semi Bold", T.ink);
await txt(frame, "SumTotalVal", CX + CW - 18 - 300, ry + 19, "Rp102.500", 19, "Bold", T.blue, { width: 300, align: "RIGHT" });
// Tombol (marginTop 18, tinggi 44)
const by = ry + 76;
rect(frame, "CekBtn", CX + 18, by, 297, 44, T.surface, 11, T.line);
await centerTxt(frame, "CekBtnText", CX + 18 + 148, by + 22, "Cek Transaksi", 14, "Semi Bold", T.ink);
rect(frame, "BelanjaBtn", CX + 325, by, 297, 44, T.blue, 11);
await centerTxt(frame, "BelanjaBtnText", CX + 325 + 148, by + 22, "Belanja Lagi", 14, "Semi Bold", "#FFFFFF");
// Sesuaikan tinggi kartu: padding bawah 6px seperti figma-desktop-sukses.js
const cardH = by + 44 + 6 - y;
const card = frame.children.find((n) => n.name === "SuccessCard");
card.resize(CW, cardH);
const contentBottom = y + cardH;

// ---- Footer (y = contentBottom + 40) ----
{
  const fy = contentBottom + 40;
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

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, noteH, cardH, contentBottom, tokenW: token.width, tokenH: token.height, dashApplied: box.dashPattern ? box.dashPattern.join(",") : "n/a" };
