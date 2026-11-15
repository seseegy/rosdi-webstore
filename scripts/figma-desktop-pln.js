// Builder frame Figma "Token PLN — Desktop" Rosdi Store (1280px).
// Dijalankan lewat use_figma; placeholder __NAME__/__X__/__Y__/__TOKENS__
// diisi driver sebelum dikirim. Token mengikuti sistem desain maraton.
// Isi mengikuti src/pages/PlnPage.jsx (Token PLN) +
// src/pages/CheckoutShell.jsx + src/data.js (harga katalog).
// PLN tidak punya langkah Jumlah (qtyEnabled=false), jadi penomoran
// langkah: 1 ID Pelanggan, 2 Nominal, 3 Pembayaran, 4 Kontak, 5 Promo.
// Contoh terpilih: Token 100.000 Rp102.500, bayar QRIS (tanpa biaya).
// Fee pulsa 7%: round(102500*0.07)=7175 -> Rp109.675.
// Meta nominal dipendekkan dari data.js ("Harga token RpX + admin Rp2.500"
// -> "Token RpX + admin Rp2.500") agar muat satu baris di sel 228px.
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
  if (opts.strike) n.textDecoration = "STRIKETHROUGH";
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
async function stepHead(parent, x, y, num, title) {
  ellipse(parent, "StepNum " + num, x, y, 24, 24, T.blueStrong);
  await centerTxt(parent, "StepNumText " + num, x + 12, y + 12, String(num), 12.5, "Bold", "#FFFFFF");
  await txt(parent, "StepTitle " + num, x + 34, y + 3, title, 15.5, "Bold", T.ink);
}
async function inputField(parent, x, y, w, label, value) {
  await txt(parent, "Label " + label, x, y, label, 12, "Medium", T.sub);
  rect(parent, "Input " + label, x, y + 20, w, 44, T.field, 10, T.line);
  await txt(parent, "InputText " + label, x + 12, y + 34, value, 14, "Regular", T.ink);
}
async function nomCell(parent, x, y, w, it, selected) {
  rect(parent, "Nom " + it.name, x, y, w, 86, selected ? T.soft : T.surface, 12, selected ? T.blue : T.line, selected ? 2 : 1);
  await txt(parent, "NomName " + it.name, x + 12, y + 12, it.name, 13.5, "Semi Bold", T.ink);
  if (it.meta) await txt(parent, "NomMeta " + it.name, x + 12, y + 32, it.meta, 11.5, "Regular", T.sub);
  const price = await txt(parent, "NomPrice " + it.name, x + 12, y + 58, it.price, 13.5, "Bold", T.blue);
  if (it.was) await txt(parent, "NomWas " + it.name, x + 12 + price.width + 6, y + 61, it.was, 11.5, "Regular", T.sub, { strike: true });
  if (it.badge) {
    const bw = it.badge === "Terlaris" ? 62 : 42;
    rect(parent, "NomBadge " + it.name, x + w - 12 - bw, y + 10, bw, 20, it.badge === "Terlaris" ? T.green : T.red, 6);
    await centerTxt(parent, "NomBadgeText " + it.name, x + w - 12 - bw / 2, y + 20, it.badge, 10.5, "Bold", "#FFFFFF");
  }
}
async function payRow(parent, x, y, w, p, selected) {
  const dis = !!p.status;
  rect(parent, "Pay " + p.name, x, y, w, 54, selected ? T.soft : T.surface, 12, selected ? T.blue : T.line, selected ? 2 : 1);
  rect(parent, "PayMark " + p.name, x + 12, y + 9, 36, 36, T.soft, 9);
  await centerTxt(parent, "PayMarkText " + p.name, x + 30, y + 27, p.mark, 12, "Bold", dis ? T.faint : T.blue);
  await txt(parent, "PayName " + p.name, x + 58, y + 11, p.name, 13.5, "Semi Bold", dis ? T.faint : T.ink);
  await txt(parent, "PayDesc " + p.name, x + 58, y + 31, p.desc, 12, "Regular", T.sub);
  if (dis) {
    rect(parent, "PayStatus " + p.name, x + w - 12 - 108, y + 16, 108, 22, T.surface2, 7);
    await centerTxt(parent, "PayStatusText " + p.name, x + w - 12 - 54, y + 27, p.status, 11, "Semi Bold", T.sub);
  } else {
    await txt(parent, "PayPrice " + p.name, x + w - 12 - 150, y + 10, p.price, 14.5, "Bold", T.ink, { width: 150, align: "RIGHT" });
    await txt(parent, "PayFee " + p.name, x + w - 12 - 150, y + 31, p.fee, 11, "Regular", T.sub, { width: 150, align: "RIGHT" });
  }
}

const frame = figma.createFrame();
frame.name = FRAME_NAME;
frame.x = FX; frame.y = FY;
frame.resize(1280, 2400);
frame.fills = solid(T.bg);
frame.clipsContent = false;
figma.currentPage.appendChild(frame);


// ---- Header (62) ----
rect(frame, "HeaderBg", 0, 0, 1280, 62, T.surface, 0);
rect(frame, "HeaderLine", 0, 62, 1280, 1, T.line, 0);
rect(frame, "LogoMark", 80, 13, 36, 36, T.blue, 10);
await centerTxt(frame, "LogoR", 98, 31, "R", 18, "Extra Bold", "#FFFFFF");
await txt(frame, "LogoName", 126, 15, "Rosdi Store", 17, "Extra Bold", T.ink);
await txt(frame, "LogoTag", 126, 37, "Top up instan 24 jam", 10.5, "Medium", T.sub);
rect(frame, "NavBeranda", 330, 14, 76, 34, T.soft, 9);
await centerTxt(frame, "NavBerandaText", 368, 31, "Beranda", 13.5, "Medium", T.blue);
await txt(frame, "NavCek", 418, 22, "Cek Transaksi", 13.5, "Medium", T.sub);
rect(frame, "ThemeBtn", 1072, 12, 38, 38, T.surface, 10, T.line);
await centerTxt(frame, "ThemeIcon", 1091, 31, "☾", 16, "Regular", T.sub);
rect(frame, "MasukBtn", 1118, 12, 82, 38, T.blue, 11);
await centerTxt(frame, "MasukText", 1159, 31, "Masuk", 14, "Semi Bold", "#FFFFFF");

// ---- Crumb (y 86) ----
rect(frame, "BackBtn", 80, 88, 34, 34, T.surface, 9, T.line);
await centerTxt(frame, "BackIcon", 97, 105, "‹", 18, "Regular", T.sub);
tile(frame, 126, 84, 42, "LN", "#0f766e");
await txt(frame, "CrumbTitle", 180, 86, "Token PLN", 20, "Bold", T.ink, { letterSpacing: -0.2 });
await txt(frame, "CrumbSub", 180, 110, "Prabayar · nomor token tampil & dikirim setelah pembayaran", 13, "Regular", T.sub);

// ---- Kolom kiri (x 80, w 716) & aside (x 824, w 356) ----
let y = 158;
const LX = 80, LW = 716, AX = 824, AW = 356, GAP = 16;

// ---- Langkah 1: ID Pelanggan ----
{
  const h = 190;
  rect(frame, "Step1Card", LX, y, LW, h, T.surface, 14, T.line);
  await stepHead(frame, LX + 16, y + 16, 1, "Masukkan ID Pelanggan");
  await txt(frame, "Label Nomor Meter / ID Pelanggan", LX + 16, y + 56, "Nomor Meter / ID Pelanggan", 12, "Medium", T.sub);
  rect(frame, "Input Nomor Meter / ID Pelanggan", LX + 16, y + 76, 560, 44, T.field, 10, T.line);
  await txt(frame, "InputText Nomor Meter / ID Pelanggan", LX + 28, y + 90, "543210987654", 14, "Regular", T.ink);
  rect(frame, "CheckNameBtn", LX + 588, y + 76, 96, 44, T.blue, 10);
  await centerTxt(frame, "CheckNameText", LX + 636, y + 98, "Cek Nama", 14, "Semi Bold", "#FFFFFF");
  await txt(frame, "Step1Note", LX + 16, y + 136, "Nama pelanggan: S*T* *MIN*H · Tarif: R1 / 1300 VA. Pastikan nama ini sesuai sebelum membayar — token yang sudah terbit tidak bisa dibatalkan.", 12.5, "Regular", T.green, { width: 684, lineHeight: 19 });
  y += h + GAP;
}

// ---- Langkah 2: Nominal (6 token PLN, data.js) ----
const NOMS = [
  { name: "Token 20.000", price: "Rp22.500", meta: "Token Rp20.000 + admin Rp2.500" },
  { name: "Token 50.000", price: "Rp52.500", meta: "Token Rp50.000 + admin Rp2.500" },
  { name: "Token 100.000", price: "Rp102.500", meta: "Token Rp100.000 + admin Rp2.500" },
  { name: "Token 200.000", price: "Rp202.500", meta: "Token Rp200.000 + admin Rp2.500" },
  { name: "Token 500.000", price: "Rp502.500", meta: "Token Rp500.000 + admin Rp2.500" },
  { name: "Token 1.000.000", price: "Rp1.002.500", meta: "Token Rp1.000.000 + admin Rp2.500" },
];
{
  const rows = Math.ceil(NOMS.length / 3);
  const gridH = rows * 86 + (rows - 1) * 10;
  const h = 16 + 24 + 16 + gridH + 16;
  rect(frame, "Step2Card", LX, y, LW, h, T.surface, 14, T.line);
  await stepHead(frame, LX + 16, y + 16, 2, "Pilih Nominal");
  const cw = 228, cg = 10;
  for (let i = 0; i < NOMS.length; i++) {
    const cx = LX + 16 + (i % 3) * (cw + cg);
    const cy = y + 56 + Math.floor(i / 3) * (86 + cg);
    await nomCell(frame, cx, cy, cw, NOMS[i], NOMS[i].name === "Token 100.000");
  }
  y += h + GAP;
}

// ---- Langkah 3: Pembayaran (base Token 100.000 Rp102.500) ----
const PAYS = [
  { group: "Rekomendasi", items: [
    { name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp102.500", fee: "tanpa biaya" },
  ]},
  { group: "E-Wallet", items: [
    { name: "GoPay", mark: "GP", desc: "Saldo terpotong otomatis", price: "Rp102.750", fee: "biaya Rp250" },
    { name: "DANA", mark: "DN", desc: "Saldo terpotong otomatis", price: "Rp102.750", fee: "biaya Rp250" },
    { name: "OVO", mark: "OV", desc: "Saldo terpotong otomatis", price: "Rp102.750", fee: "biaya Rp250" },
    { name: "ShopeePay", mark: "SP", desc: "Saldo terpotong otomatis", price: "Rp102.750", fee: "biaya Rp250" },
  ]},
  { group: "Virtual Account", items: [
    { name: "BCA Virtual Account", mark: "BCA", desc: "Cek otomatis", price: "Rp105.000", fee: "biaya Rp2.500" },
    { name: "Mandiri Virtual Account", mark: "MDR", desc: "Cek otomatis", price: "Rp105.000", fee: "biaya Rp2.500" },
    { name: "BRI Virtual Account", mark: "BRI", desc: "Cek otomatis", price: "Rp105.000", fee: "biaya Rp2.500" },
    { name: "Danamon Virtual Account", mark: "DNM", desc: "Cek otomatis", status: "Lagi perbaikan" },
  ]},
  { group: "Gerai Retail", items: [
    { name: "Alfamart", mark: "ALF", desc: "Bayar di kasir", price: "Rp105.000", fee: "biaya Rp2.500" },
    { name: "Indomaret", mark: "IDM", desc: "Bayar di kasir", price: "Rp105.000", fee: "biaya Rp2.500" },
  ]},
  { group: "Pulsa", items: [
    { name: "Pulsa Telkomsel", mark: "TS", desc: "Potong pulsa nomor tujuan", price: "Rp109.675", fee: "biaya Rp7.175" },
    { name: "Pulsa XL", mark: "XL", desc: "Potong pulsa nomor tujuan", price: "Rp109.675", fee: "biaya Rp7.175" },
  ]},
];
{
  let rowsH = 0;
  for (const g of PAYS) rowsH += 24 + g.items.length * 54 + (g.items.length - 1) * 8 + 10;
  const h = 16 + 24 + 16 + rowsH + 6;
  rect(frame, "Step3Card", LX, y, LW, h, T.surface, 14, T.line);
  await stepHead(frame, LX + 16, y + 16, 3, "Pilih Pembayaran");
  let py = y + 56;
  for (const g of PAYS) {
    await txt(frame, "PayGroup " + g.group, LX + 16, py, g.group, 12.5, "Bold", T.sub);
    py += 24;
    for (const p of g.items) {
      await payRow(frame, LX + 16, py, LW - 32, p, p.name === "QRIS");
      py += 54 + 8;
    }
    py += 2;
  }
  y += h + GAP;
}

// ---- Langkah 4: Detail Kontak ----
{
  const h = 180;
  rect(frame, "Step4Card", LX, y, LW, h, T.surface, 14, T.line);
  await stepHead(frame, LX + 16, y + 16, 4, "Detail Kontak");
  await inputField(frame, LX + 16, y + 56, 342, "Email (opsional)", "nama@email.com");
  await inputField(frame, LX + 372, y + 56, 328, "WhatsApp (opsional)", "08xxxxxxxxxx");
  await txt(frame, "Step4Note", LX + 16, y + 134, "Bukti pembayaran dan status pesanan dikirim ke kontak ini. Boleh dikosongkan — hasil transaksi tetap tampil di halaman sukses.", 12.5, "Regular", T.sub, { width: 684, lineHeight: 19 });
  y += h + GAP;
}

// ---- Langkah 5: Kode Promo ----
{
  const h = 132;
  rect(frame, "Step5Card", LX, y, LW, h, T.surface, 14, T.line);
  await stepHead(frame, LX + 16, y + 16, 5, "Kode Promo");
  rect(frame, "PromoInput", LX + 16, y + 56, 560, 44, T.field, 10, T.line);
  await txt(frame, "PromoPlaceholder", LX + 28, y + 70, "Punya kode promo? Coba ROSDI10", 14, "Regular", T.faint);
  rect(frame, "PromoBtn", LX + 588, y + 56, 96, 44, T.blue, 10);
  await centerTxt(frame, "PromoBtnText", LX + 636, y + 78, "Pakai", 14, "Semi Bold", "#FFFFFF");
  y += h + GAP;
}
const contentBottom = y - GAP;

// ---- Aside: Ringkasan ----
{
  const h = 486;
  rect(frame, "SummaryCard", AX, 158, AW, h, T.surface, 14, T.line);
  await txt(frame, "SumTitle", AX + 16, 158 + 16, "Ringkasan", 15.5, "Bold", T.ink);
  const rows = [
    ["Produk", "Token PLN"],
    ["Item", "Token 100.000"],
    ["Tujuan", "543210987654"],
    ["Pembayaran", "QRIS"],
    ["Harga", "Rp102.500"],
    ["Biaya pembayaran", "Rp0"],
  ];
  let ry = 158 + 52;
  for (const [lab, val] of rows) {
    await txt(frame, "SumLab " + lab, AX + 16, ry, lab, 13, "Regular", T.sub);
    await txt(frame, "SumVal " + lab, AX + AW - 16 - 210, ry, val, 13, "Semi Bold", T.ink, { width: 210, align: "RIGHT" });
    ry += 30;
  }
  rect(frame, "SumDivider", AX + 16, ry + 2, AW - 32, 1, T.line, 0);
  await txt(frame, "SumTotalLab", AX + 16, ry + 14, "Total", 15, "Bold", T.ink);
  await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp102.500", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });
  await txt(frame, "SumNote", AX + 16, ry + 48, "Total ini sama persis dengan harga pada metode pembayaran yang kamu pilih. Tidak ada biaya tambahan setelah ini.", 12, "Regular", T.sub, { width: AW - 32, lineHeight: 18 });
  rect(frame, "SumBuyBtn", AX + 16, ry + 116, AW - 32, 46, T.blue, 10);
  await centerTxt(frame, "SumBuyText", AX + AW / 2, ry + 139, "Beli Sekarang", 14.5, "Semi Bold", "#FFFFFF");
  await txt(frame, "SumGuarantee", AX + 16, ry + 176, "✓  Garansi: token tidak terbit, uang kembali penuh. Simpan nomor transaksi untuk klaim.", 12, "Regular", T.sub, { width: AW - 32, lineHeight: 18 });
}

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
