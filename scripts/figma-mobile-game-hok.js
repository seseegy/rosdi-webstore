// Builder frame Figma "Honor of Kings" mobile (390px), diklon dari frame
// Produk Game mobile (1:208 Light / 1:314 Dark) lalu diubah isinya.
// Menutup celah: Honor of Kings hanya punya varian desktop (93:2/93:249);
// game mobile yang ada baru MLBB, Genshin, Free Fire, PUBG.
// Isi mengikuti src/pages/GamePage.jsx (game honor-of-kings, tanpa Zone ID /
// server) + src/data.js (GAMES honor-of-kings: tab Token 6 item +
// Weekly Card 2 item) + CheckoutShell.
// Langkah: 1 User ID (kolom tunggal), 2 Nominal (tab Token aktif /
// Weekly Card; grid 2 kolom sesuai .nom-grid <=560px), 3 Jumlah,
// 4 Pembayaran (ringkas: QRIS + GoPay + DANA + catatan VA),
// 5 Detail Kontak, 6 Kode Promo, lalu bilah bawah.
// Contoh terpilih: 240 Token Rp21.500 (Terlaris, sama seperti varian
// desktop), bayar QRIS (tanpa biaya).
// Harga dihitung lewat calcTotals data.js (node -e), bukan tangan:
// QRIS Rp21.500, GoPay/DANA Rp21.750 (fee 250), BCA VA Rp24.000
// (fee 2.500). Grid 2 kolom mengikuti pola Genshin Siklus 5 /
// perbaikan PLN Siklus 29 (bukan 3 kolom 104px frame asal).
// Catatan stok memakai teks kode saat ini ("Stok tersedia · maksimal 10
// per transaksi"), bukan "Stok: tersedia" warisan frame asal (temuan
// Siklus 46; frame MLBB asal + FF masih membawa teks lama).
const FRAME_NAME = "__NAME__";
const SRC_ID = "__SRC__";
const FX = __X__;
const FY = __Y__;

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

const ITEMS = [
  { name: "16 Token", price: "Rp1.500" },
  { name: "80 Token", price: "Rp7.200" },
  { name: "240 Token", price: "Rp21.500", badge: "Terlaris" },
  { name: "400 Token", price: "Rp35.500" },
  { name: "800 Token", price: "Rp71.000" },
  { name: "2400 Token", price: "Rp212.000" },
];
const SELECTED = 2; // 240 Token Rp21.500

async function setText(node, str, width) {
  const segs = node.getStyledTextSegments(["fontName", "fontSize"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = str;
  if (width) { node.textAutoResize = "HEIGHT"; node.resize(width, node.height); }
}
async function newText(parent, name, x, y, str, size, weight, color, width) {
  const n = figma.createText();
  n.name = name; n.x = x; n.y = y;
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.fills = solid(color); n.characters = str;
  if (width) { n.textAutoResize = "HEIGHT"; n.resize(width, n.height); }
  parent.appendChild(n); return n;
}
async function measureW(str, size, weight) {
  const n = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.characters = str;
  const w = n.width; n.remove(); return w;
}

const src = figma.getNodeById(SRC_ID);
if (!src) throw new Error("frame sumber tidak ditemukan: " + SRC_ID);
const frame = src.clone();
frame.name = FRAME_NAME;
figma.currentPage.appendChild(frame);
frame.x = FX; frame.y = FY;

const byXY = (type, x, y) => frame.children.find((n) => n.type === type && Math.round(n.x) === x && Math.round(n.y) === y);
const byXYW = (type, x, y, w) => frame.children.find((n) => n.type === type && Math.round(n.x) === x && Math.round(n.y) === y && Math.round(n.width) === w);

// ---- tangkap gaya sebelum menghapus ----
const cellNorm = byXYW("RECTANGLE", 32, 342, 104); // sel 86 Diamonds (tak terpilih)
const cellSel = byXYW("RECTANGLE", 144, 342, 104); // sel 172 Diamonds (terpilih)
const nameNorm = byXY("TEXT", 42, 350);
const priceNorm = byXY("TEXT", 42, 372);
const nameSel = byXY("TEXT", 154, 350);
const priceSel = byXY("TEXT", 154, 372);
const badgeTerlarisRect = byXYW("RECTANGLE", 202, 370, 42);
const badgeTerlarisText = byXY("TEXT", 206, 372);
const badgeDiscRect = byXYW("RECTANGLE", 314, 432, 42);
const badgeDiscText = byXY("TEXT", 318, 434);
const tabActiveRect = byXYW("RECTANGLE", 32, 300, 78); // Diamonds (aktif)
const tabActiveText = byXY("TEXT", 43, 307);
const tabInactiveRect = byXYW("RECTANGLE", 118, 300, 99); // Weekly Pass
const tabInactiveText = byXY("TEXT", 129, 307);
if (!cellNorm || !cellSel || !nameNorm || !priceNorm || !badgeTerlarisRect || !badgeTerlarisText || !badgeDiscRect || !badgeDiscText || !tabActiveRect || !tabActiveText || !tabInactiveRect || !tabInactiveText)
  throw new Error("struktur frame sumber tidak seperti diduga");

// ---- header: tile HK biru gelap TiMi + judul + sub ----
const tileRect = byXYW("RECTANGLE", 48, 14, 36);
tileRect.fills = solid("#1e3a8a");
const tileText = frame.children.find((n) => n.type === "TEXT" && n.characters === "ML");
await setText(tileText, "HK");
const title = frame.children.find((n) => n.type === "TEXT" && n.characters === "Mobile Legends");
const titleW = await measureW("Honor of Kings", title.fontSize, title.fontName.style);
await setText(title, "Honor of Kings", Math.ceil(titleW) + 2);
const sub = frame.children.find((n) => n.type === "TEXT" && n.characters === "Top up langsung · Moonton");
const subW = await measureW("TiMi Studio · Top up token langsung ke akun", sub.fontSize, sub.fontName.style);
await setText(sub, "TiMi Studio · Top up token langsung ke akun", Math.ceil(subW) + 2);

// ---- langkah 1: hapus kolom Zone ID, input UID jadi selebar penuh ----
const zoneRect = byXYW("RECTANGLE", 248, 140, 110);
const zoneText = byXY("TEXT", 260, 153);
if (!zoneRect || !zoneText) throw new Error("kolom Zone ID tidak ditemukan");
zoneRect.remove(); zoneText.remove();
const uidRect = byXYW("RECTANGLE", 32, 140, 208);
uidRect.resize(326, 42);
const note1 = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Contoh: 12345678(1234)") === 0);
await setText(note1, "Contoh penulisan: 12345678.", 326);

// ---- langkah 2: tab Token aktif + Weekly Card; hapus tab Twilight ----
const tabTwilightRect = byXYW("RECTANGLE", 225, 300, 113);
const tabTwilightText = byXY("TEXT", 236, 307);
tabTwilightRect.remove(); tabTwilightText.remove();
const tokenW = await measureW("Token", tabActiveText.fontSize, tabActiveText.fontName.style);
tabActiveRect.resize(Math.ceil(tokenW) + 22, 28);
await setText(tabActiveText, "Token", Math.ceil(tokenW));
const weeklyW = await measureW("Weekly Card", tabInactiveText.fontSize, tabInactiveText.fontName.style);
tabInactiveRect.resize(Math.ceil(weeklyW) + 22, 28);
await setText(tabInactiveText, "Weekly Card", Math.ceil(weeklyW));

// ---- hapus 6 sel MLBB lama (rect + nama + harga + badge + teks kosong) ----
const cellFills = cellNorm.fills, cellStrokes = cellNorm.strokes, cellStrokeW = cellNorm.strokeWeight, cellRadius = cellNorm.cornerRadius;
const selFills = cellSel.fills, selStrokes = cellSel.strokes, selStrokeW = cellSel.strokeWeight;
const nameFont = nameNorm.fontName, nameSize = nameNorm.fontSize, nameFills = nameNorm.fills;
const priceFont = priceNorm.fontName, priceSize = priceNorm.fontSize, priceFills = priceNorm.fills;
const nameSelFills = nameSel.fills, priceSelFills = priceSel.fills;
const badgeTerFills = badgeTerlarisRect.fills, badgeTerStrokes = badgeTerlarisRect.strokes, badgeTerStrokeW = badgeTerlarisRect.strokeWeight, badgeTerRadius = badgeTerlarisRect.cornerRadius;
const badgeTerFont = badgeTerlarisText.fontName, badgeTerSize = badgeTerlarisText.fontSize, badgeTerTextFills = badgeTerlarisText.fills;
const badgeDiscFills = badgeDiscRect.fills, badgeDiscStrokes = badgeDiscRect.strokes, badgeDiscStrokeW = badgeDiscRect.strokeWeight, badgeDiscRadius = badgeDiscRect.cornerRadius;
const badgeDiscFont = badgeDiscText.fontName, badgeDiscSize = badgeDiscText.fontSize, badgeDiscTextFills = badgeDiscText.fills;
for (const n of [...frame.children]) {
  if (n.type === "RECTANGLE" && Math.round(n.width) === 104 && (Math.round(n.y) === 342 || Math.round(n.y) === 404)) n.remove();
  else if (n.type === "RECTANGLE" && Math.round(n.width) === 42 && Math.round(n.height) === 14) n.remove();
  else if (n.type === "TEXT" && [350, 372, 384, 412, 434, 446].includes(Math.round(n.y)) && Math.round(n.x) >= 32) n.remove();
}

// ---- geser simpul lama dulu (langkah 3 ke bawah, y>=502), baru buat sel ----
// Grid baru: 2 kolom x 158, 3 baris, gap 8 -> bawah grid 520; kartu 2 jadi
// 300 (bawah 548, padding bawah 28 seperti frame asal) -> delta +62.
const COLW = 158, GAPX = 10, PADX = 12, PADT = 8;
const TEXTW = COLW - PADX * 2;
const ROWS = [342, 404, 466];
const DELTA = 62;
for (const n of frame.children) if (n.y >= 502) n.y += DELTA;
const card2 = byXYW("RECTANGLE", 16, 248, 358);
card2.resize(358, 300);
frame.resize(390, 1576 + DELTA);

// ---- sel Honor of Kings baru ----
for (let i = 0; i < ITEMS.length; i++) {
  const p = ITEMS[i];
  const r = Math.floor(i / 2), c = i % 2;
  const cx = 32 + c * (COLW + GAPX), cy = ROWS[r];
  const selected = i === SELECTED;
  const rect = figma.createRectangle();
  rect.name = "HoK " + p.name; rect.x = cx; rect.y = cy;
  rect.resize(COLW, 54);
  rect.fills = selected ? selFills : cellFills;
  rect.strokes = selected ? selStrokes : cellStrokes;
  rect.strokeWeight = selected ? selStrokeW : cellStrokeW;
  rect.cornerRadius = cellRadius;
  frame.appendChild(rect);
  const nm = await newText(frame, "HoKName " + p.name, cx + PADX, cy + PADT, p.name, nameSize, nameFont.style, "#000000", TEXTW);
  nm.fills = selected ? nameSelFills : nameFills;
  const pr = await newText(frame, "HoKPrice " + p.name, cx + PADX, cy + 30, p.price, priceSize, priceFont.style, "#000000", TEXTW);
  pr.fills = selected ? priceSelFills : priceFills;
  if (p.badge) {
    const isTer = p.badge === "Terlaris";
    const bx = cx + COLW - 12 - 42, by = cy + 28;
    const br = figma.createRectangle();
    br.name = "HoKBadge " + p.badge; br.x = bx; br.y = by;
    br.resize(42, 14);
    br.fills = isTer ? badgeTerFills : badgeDiscFills;
    br.strokes = isTer ? badgeTerStrokes : badgeDiscStrokes;
    br.strokeWeight = isTer ? badgeTerStrokeW : badgeDiscStrokeW;
    br.cornerRadius = isTer ? badgeTerRadius : badgeDiscRadius;
    frame.appendChild(br);
    const bt = await newText(frame, "HoKBadgeText " + p.badge, bx + 4, by + 2, p.badge, isTer ? badgeTerSize : badgeDiscSize, (isTer ? badgeTerFont : badgeDiscFont).style, "#000000", isTer ? 34 : 30);
    bt.fills = isTer ? badgeTerTextFills : badgeDiscTextFills;
  }
}

// ---- langkah 3: catatan stok memakai teks kode saat ini ----
const stockNote = frame.children.find((n) => n.type === "TEXT" && n.characters === "Stok: tersedia");
await setText(stockNote, "Stok tersedia · maksimal 10 per transaksi", 196);

// ---- langkah 4: harga pembayaran base Rp21.500 ----
const payQRIS = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp43.500" && Math.round(n.y) === 702 + DELTA);
await setText(payQRIS, "Rp21.500");
const payGoPay = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp43.750" && Math.round(n.y) === 756 + DELTA);
await setText(payGoPay, "Rp21.750");
const payDANA = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp43.750" && Math.round(n.y) === 810 + DELTA);
await setText(payDANA, "Rp21.750");
const vaNote = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Virtual Account") === 0);
await setText(vaNote, "Virtual Account · BCA Rp24.000 (biaya Rp2.500) · Danamon: lagi perbaikan", 326);

// ---- bilah bawah: harga + total + ringkasan ----
const barHarga = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp43.500" && Math.round(n.y) === 1480 + DELTA);
await setText(barHarga, "Rp21.500");
const barTotal = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp43.500" && Math.round(n.y) === 1514 + DELTA);
await setText(barTotal, "Rp21.500");
const summary = frame.children.find((n) => n.type === "TEXT" && n.characters === "172 Diamonds · QRIS");
await setText(summary, "240 Token · QRIS", 170);

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, delta: DELTA };
