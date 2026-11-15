// Builder frame Figma "Cek Transaksi — Desktop" Rosdi Store (1280px).
// Dijalankan lewat use_figma; placeholder __NAME__/__X__/__Y__/__TOKENS__
// diisi driver sebelum dikirim. Token mengikuti sistem desain maraton.
// Isi mengikuti src/pages/InfoPages.jsx (CekPage) + src/components/Header.jsx
// + src/index.css (.step, .input, .sum-row, .timeline, .btn).
// Halaman info maxWidth 640 di kode -> kolom konten 640 terpusat (x=320).
// Contoh terpilih: nomor demo RSD-DEMO1234 (cabang demo di kode) — order
// Mobile Legends 172 Diamonds, tujuan 12345678 (1234), QRIS Rp43.500,
// status Selesai; timeline 3 item selesai. Riwayat menampilkan order demo
// yang sama (bagian itu muncul di kode bila ada order di perangkat).
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

const frame = figma.createFrame();
frame.name = FRAME_NAME;
frame.x = FX; frame.y = FY;
frame.resize(1280, 1200);
frame.fills = solid(T.bg);
frame.clipsContent = false;
figma.currentPage.appendChild(frame);

// ---- Header (62) — nav aktif: Cek Transaksi ----
rect(frame, "HeaderBg", 0, 0, 1280, 62, T.surface, 0);
rect(frame, "HeaderLine", 0, 62, 1280, 1, T.line, 0);
rect(frame, "LogoMark", 80, 13, 36, 36, T.blue, 10);
await centerTxt(frame, "LogoR", 98, 31, "R", 18, "Extra Bold", "#FFFFFF");
await txt(frame, "LogoName", 126, 15, "Rosdi Store", 17, "Extra Bold", T.ink);
await txt(frame, "LogoTag", 126, 37, "Top up instan 24 jam", 10.5, "Medium", T.sub);
await txt(frame, "NavBeranda", 330, 22, "Beranda", 13.5, "Medium", T.sub);
rect(frame, "NavCek", 406, 14, 118, 34, T.soft, 9);
await centerTxt(frame, "NavCekText", 465, 31, "Cek Transaksi", 13.5, "Medium", T.blue);
rect(frame, "ThemeBtn", 1072, 12, 38, 38, T.surface, 10, T.line);
await centerTxt(frame, "ThemeIcon", 1091, 31, "☾", 16, "Regular", T.sub);
rect(frame, "MasukBtn", 1118, 12, 82, 38, T.blue, 11);
await centerTxt(frame, "MasukText", 1159, 31, "Masuk", 14, "Semi Bold", "#FFFFFF");

// ---- Crumb (y 86) — tanpa tombol kembali di kode ----
const CX = 320, CW = 640;
await txt(frame, "CrumbTitle", CX, 86, "Cek Transaksi", 20, "Bold", T.ink, { letterSpacing: -0.2 });
await txt(frame, "CrumbSub", CX, 110, "Masukkan nomor transaksi dari halaman sukses", 13, "Regular", T.sub);

// ---- Kartu 1: Lacak + hasil (y 158, h 334) ----
{
  const y = 158, h = 334;
  rect(frame, "CekCard", CX, y, CW, h, T.surface, 14, T.line);
  // Baris input + tombol Lacak (input 46px, kode .input)
  rect(frame, "CekInput", CX + 18, y + 18, 498, 46, T.field, 11, T.line);
  await txt(frame, "CekInputText", CX + 32, y + 33, "RSD-DEMO1234", 14.5, "Regular", T.ink);
  rect(frame, "LacakBtn", CX + 526, y + 18, 96, 46, T.blue, 11);
  await centerTxt(frame, "LacakBtnText", CX + 574, y + 41, "Lacak", 14, "Semi Bold", "#FFFFFF");
  // Hasil ditemukan (sum-row 3 x 30px)
  const rows = [
    ["Produk", "Mobile Legends — 172 Diamonds"],
    ["Tujuan", "12345678 (1234)"],
    ["Pembayaran", "QRIS · Rp43.500"],
  ];
  let ry = y + 80;
  for (const [lab, val] of rows) {
    await txt(frame, "FoundLab " + lab, CX + 18, ry, lab, 13.5, "Regular", T.sub);
    await txt(frame, "FoundVal " + lab, CX + CW - 18 - 300, ry, val, 13.5, "Semi Bold", T.ink, { width: 300, align: "RIGHT" });
    ry += 30;
  }
  // Timeline (3 item, masing-masing 46px)
  const items = [
    ["Pesanan dibuat", "10/11/2026, 04.11"],
    ["Pembayaran diterima", "Metode: QRIS"],
    ["Item terkirim", "Selesai"],
  ];
  let ty = y + 178;
  for (const [lab, small] of items) {
    ellipse(frame, "TlDot " + lab, CX + 18, ty + 4, 11, 11, T.green);
    await txt(frame, "TlLab " + lab, CX + 41, ty, lab, 13.5, "Regular", T.ink);
    await txt(frame, "TlSmall " + lab, CX + 41, ty + 19, small, 12, "Regular", T.sub);
    ty += 46;
  }
}

// ---- Kartu 2: Transaksi terakhir (y 506, h 107) ----
{
  const y = 506, h = 107;
  rect(frame, "HistoryCard", CX, y, CW, h, T.surface, 14, T.line);
  await txt(frame, "HistoryTitle", CX + 18, y + 18, "Transaksi terakhir di perangkat ini", 15, "Bold", T.ink);
  await txt(frame, "HistRef", CX + 18, y + 47, "RSD-DEMO1234", 13.5, "Semi Bold", T.ink);
  await txt(frame, "HistSub", CX + 18, y + 66, "Mobile Legends — 172 Diamonds", 12, "Regular", T.sub);
  await txt(frame, "HistVal", CX + CW - 18 - 200, y + 47, "Rp43.500 · Selesai", 13.5, "Semi Bold", T.ink, { width: 200, align: "RIGHT" });
}
const contentBottom = 613;

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

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, contentBottom };
