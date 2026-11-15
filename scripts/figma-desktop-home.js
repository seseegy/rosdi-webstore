// Builder frame Figma "Beranda — Desktop" Rosdi Store (1280px).
// Dijalankan lewat use_figma; placeholder __NAME__/__X__/__Y__/__TOKENS__
// diisi driver sebelum dikirim. Token mengikuti sistem desain maraton.
const T = __TOKENS__;
const FRAME_NAME = "__NAME__";
const FX = __X__;
const FY = __Y__;

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

function rect(parent, name, x, y, w, h, fill, radius, stroke) {
  const n = figma.createRectangle();
  n.name = name; n.x = x; n.y = y; n.resize(w, h);
  n.fills = fill ? solid(fill) : [];
  if (radius) n.cornerRadius = radius;
  if (stroke) { n.strokes = solid(stroke); n.strokeWeight = 1; }
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
async function chip(parent, x, y, label, on) {
  const w = Math.round(label.length * 6.8 + 30);
  const r = rect(parent, "Chip " + label, x, y, w, 34, on ? T.blueStrong : T.surface, 17, on ? null : T.line);
  await centerTxt(parent, "ChipText " + label, x + w / 2, y + 17, label, 13, "Medium", on ? "#FFFFFF" : T.sub);
  return { node: r, w };
}
async function gameCard(parent, x, y, w, g) {
  rect(parent, "Card " + g.name, x, y, w, 140, T.surface, 14, T.line);
  await tile(parent, x + 14, y + 14, 46, g.ini, g.color);
  await txt(parent, "Name " + g.name, x + 14, y + 72, g.name, 14.5, "Semi Bold", T.ink);
  await txt(parent, "Sub " + g.name, x + 14, y + 93, g.sub, 12.5, "Regular", T.sub);
  await txt(parent, "From " + g.name, x + 14, y + 112, g.from, 13, "Semi Bold", T.blue);
}
async function flashCard(parent, x, y, w, f) {
  rect(parent, "Flash " + f.name, x, y, w, 140, T.surface, 14, T.line);
  await tile(parent, x + 14, y + 14, 44, f.ini, f.color);
  await txt(parent, "FlashName " + f.name, x + 70, y + 16, f.name, 14.5, "Semi Bold", T.ink);
  await txt(parent, "FlashSub " + f.name, x + 70, y + 36, f.sub, 12.5, "Regular", T.sub);
  rect(parent, "Badge -10%", x + w - 14 - 42, y + 14, 42, 20, T.red, 6);
  await centerTxt(parent, "BadgeText -10%", x + w - 14 - 21, y + 24, "-10%", 10.5, "Bold", "#FFFFFF");
  const price = await txt(parent, "FlashPrice " + f.name, x + 14, y + 68, f.price, 16, "Bold", T.blue);
  await txt(parent, "FlashWas " + f.name, x + 14 + price.width + 8, y + 71, f.was, 12, "Regular", T.sub, { strike: true });
  rect(parent, "ProgressTrack " + f.name, x + 14, y + 96, w - 28, 6, T.surface2, 3);
  rect(parent, "ProgressFill " + f.name, x + 14, y + 96, Math.round((w - 28) * f.sold / 100), 6, T.blue, 3);
  await txt(parent, "FlashSold " + f.name, x + 14, y + 110, "Terjual " + f.sold + "% dari kuota promo hari ini", 12.5, "Regular", T.sub);
}

const frame = figma.createFrame();
frame.name = FRAME_NAME;
frame.x = FX; frame.y = FY;
frame.resize(1280, 2240);
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

// ---- Hero (y 80, h 200) ----
rect(frame, "Hero", 80, 80, 1120, 200, T.blueDeep, 20);
await txt(frame, "HeroH1", 108, 110, "Top up termurah, proses instan", 27, "Extra Bold", "#FFFFFF", { letterSpacing: -0.54 });
await txt(frame, "HeroP", 108, 152, "Game, pulsa, paket data, token PLN, dan e-wallet dalam satu tempat. Harga final terlihat sebelum kamu membayar — tidak ada biaya siluman.", 14, "Regular", T.heroSub, { width: 480, lineHeight: 22 });
rect(frame, "HeroCTA", 108, 212, 124, 38, "#FFFFFF", 11);
await centerTxt(frame, "HeroCTAText", 170, 231, "Mulai Top Up", 14, "Semi Bold", T.blueDeep);

// ---- Search (y 294) ----
rect(frame, "SearchField", 80, 294, 1120, 46, T.surface, 12, T.line);
await txt(frame, "SearchPlaceholder", 108, 309, "Cari game, pulsa, token PLN, e-wallet…", 14, "Regular", T.faint);

// ---- Chips (y 352) ----
{
  const labels = ["Semua", "Top Up Game", "Pulsa", "Paket Data", "Token PLN", "E-Wallet", "Voucher"];
  let cx = 80;
  for (let i = 0; i < labels.length; i++) {
    const r = await chip(frame, cx, 352, labels[i], i === 0);
    cx += r.w + 8;
  }
}

// ---- Flash Sale ----
await txt(frame, "HeadFlash", 80, 412, "Flash Sale", 18, "Bold", T.ink, { letterSpacing: -0.18 });
rect(frame, "CountChip", 1080, 410, 120, 24, T.redSoft, 8);
await centerTxt(frame, "CountText", 1140, 422, "Berakhir 04:12:33", 12, "Semi Bold", T.red);
const FLASH = [
  { name: "Weekly Diamond Pass", sub: "Mobile Legends", price: "Rp27.900", was: "Rp30.900", sold: 68, ini: "ML", color: "#2563EB" },
  { name: "70 Diamonds", sub: "Free Fire", price: "Rp9.450", was: "Rp10.500", sold: 81, ini: "FF", color: "#0284C7" },
];
await flashCard(frame, 80, 447, 548, FLASH[0]);
await flashCard(frame, 652, 447, 548, FLASH[1]);

// ---- Top Up Game (grid 4 kolom) ----
await txt(frame, "HeadGame", 80, 623, "Top Up Game", 18, "Bold", T.ink, { letterSpacing: -0.18 });
{
  const note = await txt(frame, "HeadGameNote", 0, 627, "Harga mulai dari, final di halaman produk", 13, "Medium", T.blue);
  note.x = 1200 - note.width;
}
const GAMES = [
  { ini: "ML", color: "#2563EB", name: "Mobile Legends", sub: "Top up langsung ke akun", from: "Mulai Rp1.650" },
  { ini: "FF", color: "#0284C7", name: "Free Fire", sub: "Top up langsung ke akun", from: "Mulai Rp1.000" },
  { ini: "GI", color: "#0F766E", name: "Genshin Impact", sub: "Via UID, pilih server", from: "Mulai Rp12.500" },
  { ini: "PB", color: "#334155", name: "PUBG Mobile", sub: "Top up langsung ke akun", from: "Mulai Rp14.500" },
  { ini: "HK", color: "#1E3A8A", name: "Honor of Kings", sub: "Top up token langsung ke akun", from: "Mulai Rp1.500" },
  { ini: "RB", color: "#334155", name: "Roblox", sub: "Gift card Robux, kode ke email", from: "Mulai Rp15.500" },
];
{
  const xs = [80, 363, 646, 929];
  for (let i = 0; i < GAMES.length; i++) {
    await gameCard(frame, xs[i % 4], 658 + Math.floor(i / 4) * 152, 271, GAMES[i]);
  }
}

// ---- Pulsa, Data, PLN & E-Wallet (grid 3 kolom) ----
await txt(frame, "HeadUtil", 80, 976, "Pulsa, Data, PLN & E-Wallet", 18, "Bold", T.ink, { letterSpacing: -0.18 });
const UTILS = [
  { ini: "PL", color: "#2563EB", name: "Pulsa Reguler", sub: "Telkomsel, Indosat, XL, Axis, Tri, Smartfren", from: "Operator terdeteksi dari nomor" },
  { ini: "DT", color: "#0284C7", name: "Paket Data", sub: "Kuota utama & paket khusus game", from: "Masa aktif tertulis di tiap paket" },
  { ini: "LN", color: "#0F766E", name: "Token PLN", sub: "20 ribu sampai 1 juta", from: "Nama pelanggan dicek sebelum bayar" },
  { ini: "DN", color: "#2563EB", name: "Saldo DANA", sub: "Isi saldo ke nomor HP terdaftar", from: "Admin sudah termasuk di harga" },
  { ini: "GP", color: "#0F766E", name: "Saldo GoPay", sub: "Isi saldo ke nomor HP terdaftar", from: "Admin sudah termasuk di harga" },
  { ini: "OV", color: "#4C1D95", name: "Saldo OVO", sub: "Isi saldo ke nomor HP terdaftar", from: "Admin sudah termasuk di harga" },
  { ini: "SP", color: "#C2410C", name: "Saldo ShopeePay", sub: "Isi saldo ke nomor HP terdaftar", from: "Admin sudah termasuk di harga" },
  { ini: "GP", color: "#0F766E", name: "Voucher Google Play", sub: "Kode voucher dikirim ke email", from: "Dari Rp5.500" },
  { ini: "ST", color: "#334155", name: "Steam Wallet IDR", sub: "Kode voucher dikirim ke email", from: "Dari Rp12.600" },
  { ini: "PS", color: "#1E3A8A", name: "PlayStation Network ID", sub: "Kode voucher dikirim ke email", from: "Dari Rp108.000" },
];
{
  const xs = [80, 457, 834];
  const ws = [365, 365, 366];
  for (let i = 0; i < UTILS.length; i++) {
    await gameCard(frame, xs[i % 3], 1011 + Math.floor(i / 3) * 152, ws[i % 3], UTILS[i]);
  }
}

// ---- Kenapa Rosdi Store (trust 4 kolom) ----
await txt(frame, "HeadTrust", 80, 1633, "Kenapa Rosdi Store", 18, "Bold", T.ink, { letterSpacing: -0.18 });
const TRUST = [
  { ic: "⚡", t: "Proses instan", d: "Pesanan diproses otomatis dalam hitungan detik, 24 jam." },
  { ic: "Rp", t: "Harga transparan", d: "Harga tiap metode pembayaran terlihat sebelum kamu memilih." },
  { ic: "✓", t: "Garansi uang kembali", d: "Pesanan gagal? Saldo kembali penuh tanpa ribet." },
  { ic: "☎", t: "CS 24/7", d: "Tim bantuan siap lewat WhatsApp dan email kapan pun." },
];
{
  const xs = [80, 363, 646, 929];
  for (let i = 0; i < TRUST.length; i++) {
    const x = xs[i], y = 1668;
    rect(frame, "TrustCard " + TRUST[i].t, x, y, 271, 100, T.surface, 14, T.line);
    rect(frame, "TrustIc " + TRUST[i].t, x + 14, y + 14, 38, 38, T.soft, 10);
    await centerTxt(frame, "TrustIcText " + TRUST[i].t, x + 33, y + 33, TRUST[i].ic, TRUST[i].ic === "Rp" ? 13 : 17, "Bold", T.blue);
    await txt(frame, "TrustTitle " + TRUST[i].t, x + 64, y + 14, TRUST[i].t, 13.5, "Bold", T.ink);
    await txt(frame, "TrustDesc " + TRUST[i].t, x + 64, y + 36, TRUST[i].d, 12, "Regular", T.sub, { width: 193, lineHeight: 18 });
  }
}

// ---- Cara Top Up (grid 3 kolom) ----
await txt(frame, "HeadCara", 80, 1798, "Cara Top Up", 18, "Bold", T.ink, { letterSpacing: -0.18 });
const CARA = [
  { n: "1", t: "Isi data tujuan", d: "User ID game, nomor HP, atau ID pelanggan PLN — periksa ejaannya, kesalahan penulisan di luar tanggung jawab kami." },
  { n: "2", t: "Pilih nominal & pembayaran", d: "Setiap metode menampilkan harga finalnya sendiri. Tidak ada tambahan biaya setelah ini." },
  { n: "3", t: "Selesai dalam detik", d: "Item masuk otomatis. Bukti dan nomor token tampil di halaman sukses dan dikirim ke kontakmu." },
];
{
  const xs = [80, 457, 834];
  const ws = [365, 365, 366];
  for (let i = 0; i < CARA.length; i++) {
    const x = xs[i], y = 1833;
    rect(frame, "CaraCard " + CARA[i].n, x, y, ws[i], 150, T.surface, 14, T.line);
    ellipse(frame, "CaraNum " + CARA[i].n, x + 14, y + 14, 25, 25, T.blueStrong);
    await centerTxt(frame, "CaraNumText " + CARA[i].n, x + 26.5, y + 26.5, CARA[i].n, 13, "Bold", "#FFFFFF");
    await txt(frame, "CaraTitle " + CARA[i].n, x + 14, y + 51, CARA[i].t, 14.5, "Semi Bold", T.ink);
    await txt(frame, "CaraDesc " + CARA[i].n, x + 14, y + 73, CARA[i].d, 12.5, "Regular", T.sub, { width: ws[i] - 28, lineHeight: 19 });
  }
}

// ---- Footer (y 2027) ----
rect(frame, "FooterBg", 0, 2027, 1280, 210, T.surface, 0);
rect(frame, "FooterLine", 0, 2027, 1280, 1, T.line, 0);
rect(frame, "FootLogoMark", 80, 2057, 36, 36, T.blue, 10);
await centerTxt(frame, "FootLogoR", 98, 2075, "R", 18, "Extra Bold", "#FFFFFF");
await txt(frame, "FootLogoName", 126, 2063, "Rosdi Store", 17, "Extra Bold", T.ink);
await txt(frame, "FootDesc", 80, 2105, "Toko top up game, pulsa, paket data, token PLN, dan e-wallet dengan harga yang ditampilkan apa adanya sejak awal — termasuk biaya tiap metode pembayaran.", 12.5, "Regular", T.sub, { width: 340, lineHeight: 19 });
await txt(frame, "FootHProduk", 500, 2057, "Produk", 13.5, "Bold", T.ink);
{
  const links = ["Mobile Legends", "Free Fire", "Pulsa Reguler", "Token PLN"];
  for (let i = 0; i < links.length; i++) await txt(frame, "FootProduk " + links[i], 500, 2081 + i * 24, links[i], 12.5, "Regular", T.sub);
}
await txt(frame, "FootHBantuan", 700, 2057, "Bantuan", 13.5, "Bold", T.ink);
{
  const links = ["Cek Transaksi", "Cara Top Up", "Syarat & Ketentuan", "Kebijakan Pengembalian"];
  for (let i = 0; i < links.length; i++) await txt(frame, "FootBantuan " + links[i], 700, 2081 + i * 24, links[i], 12.5, "Regular", T.sub);
}
await txt(frame, "FootHPay", 940, 2057, "Pembayaran", 13.5, "Bold", T.ink);
{
  const chips = ["QRIS", "GoPay", "DANA", "OVO", "ShopeePay", "BCA", "Mandiri", "BRI", "Alfamart", "Indomaret", "Pulsa"];
  let cx = 940, cy = 2081;
  for (const p of chips) {
    const w = Math.round(p.length * 6.6 + 18);
    if (cx + w > 1200) { cx = 940; cy += 30; }
    rect(frame, "PayChip " + p, cx, cy, w, 24, T.surface, 7, T.line);
    await centerTxt(frame, "PayChipText " + p, cx + w / 2, cy + 12, p, 11, "Semi Bold", T.sub);
    cx += w + 6;
  }
}
rect(frame, "CopyrightLine", 80, 2197, 1120, 1, T.line, 0);
await txt(frame, "Copyright", 80, 2211, "© 2026 Rosdi Store · Harga diperbarui mengikuti katalog pemasok dan dapat berubah sewaktu-waktu.", 12, "Regular", T.faint);

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length };
