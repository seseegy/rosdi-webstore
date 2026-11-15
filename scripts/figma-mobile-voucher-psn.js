// Builder frame Figma "PlayStation Network ID" mobile (390px), diklon dari
// frame Voucher mobile (3:118 Light / 3:177 Dark) lalu diubah isinya.
// Dijalankan lewat use_figma; placeholder __NAME__/__SRC__/__X__/__Y__/
// __TOKENS__ diisi driver sebelum dikirim. Token mengikuti sistem desain.
// Isi mengikuti src/pages/VoucherPage.jsx (voucher playstation) +
// src/data.js (VOUCHERS playstation, 3 item, markup 1,08) + CheckoutShell.
// Langkah: 1 Email Tujuan, 2 Nominal, 3 Pembayaran (ringkas: QRIS + DANA,
// seperti frame voucher mobile asal), lalu teks langkah 4/5 + bilah bawah.
// Contoh terpilih: PSN IDR 200.000 Rp216.000, bayar QRIS (tanpa biaya).
// Fee: DANA +Rp250 -> Rp216.250.
// Grid nominal di kode 2 kolom pada <=560px (.nom-grid), jadi sel 158px
// (bukan 3 kolom 104px seperti frame asal — nama PSN IDR 15 karakter
// tidak muat 1 baris di sel 104px; lihat cacat PLN Siklus 29). Tinggi sel
// diukur dari teks (nama bisa 2 baris + meta + harga).
const T = __TOKENS__;
const FRAME_NAME = "__NAME__";
const SRC_ID = "__SRC__";
const FX = __X__;
const FY = __Y__;

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

const ITEMS = [
  { name: "PSN IDR 100.000", price: "Rp108.000", meta: "Region Indonesia" },
  { name: "PSN IDR 200.000", price: "Rp216.000", meta: "Region Indonesia" },
  { name: "PSN IDR 400.000", price: "Rp432.000", meta: "Region Indonesia" },
];
const SELECTED = 1; // PSN IDR 200.000 Rp216.000

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
async function measureH(str, size, weight, width) {
  const n = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.characters = str;
  n.textAutoResize = "HEIGHT"; n.resize(width, n.height);
  const h = n.height; n.remove(); return h;
}

const src = figma.getNodeById(SRC_ID);
if (!src) throw new Error("frame sumber tidak ditemukan: " + SRC_ID);
const frame = src.clone();
frame.name = FRAME_NAME;
figma.currentPage.appendChild(frame);
frame.x = FX; frame.y = FY;

// ---- tangkap gaya sel nominal lama sebelum dihapus ----
const oldCells = frame.children.filter((n) => n.type === "RECTANGLE" && n.width === 104 && (n.y === 280 || n.y === 354));
const oldName = frame.children.find((n) => n.type === "TEXT" && n.y === 288);
const oldPrice = frame.children.find((n) => n.type === "TEXT" && n.y === 306);
const oldMeta = frame.children.find((n) => n.type === "TEXT" && n.y === 324);
if (oldCells.length !== 6 || !oldName || !oldPrice || !oldMeta) throw new Error("struktur frame sumber tidak seperti diduga: cells=" + oldCells.length);
const cellFills = oldCells[0].fills;
const cellStrokes = oldCells[0].strokes;
const cellStrokeW = oldCells[0].strokeWeight;
const cellRadius = oldCells[0].cornerRadius;
const nameFont = oldName.fontName;
const nameSize = oldName.fontSize;
const nameFills = oldName.fills;
const priceFont = oldPrice.fontName;
const priceSize = oldPrice.fontSize;
const priceFills = oldPrice.fills;
const metaFont = oldMeta.fontName;
const metaSize = oldMeta.fontSize;

// ---- hapus 6 sel voucher GP lama (rect + teks nama + harga + meta) ----
for (const n of frame.children.filter((n) => (n.type === "RECTANGLE" && n.width === 104 && (n.y === 280 || n.y === 354)) || (n.type === "TEXT" && (n.y === 288 || n.y === 306 || n.y === 324 || n.y === 362 || n.y === 380 || n.y === 398)))) n.remove();

// ---- header: tile PS biru + judul PlayStation Network ID ----
const tileRect = frame.children.find((n) => n.type === "RECTANGLE" && n.x === 48 && n.y === 14 && n.width === 36);
if (!tileRect) throw new Error("tile header tidak ditemukan");
tileRect.fills = solid("#1e3a8a");
const tileText = frame.children.find((n) => n.type === "TEXT" && n.characters === "GP");
await setText(tileText, "PS");
const title = frame.children.find((n) => n.type === "TEXT" && n.characters === "Voucher Google Play");
await setText(title, "PlayStation Network ID", 200);

// ---- sel PSN baru (2 kolom, tinggi terukur) ----
// PENTING: geser simpul lama dulu (langkah 3 + teks langkah 4/5 + bilah
// bawah, y>=466) SEBELUM membuat sel baru (cacat Siklus 21).
const COLW = 158, GAPX = 10, GAPY = 10, PADX = 13, PADT = 12, PADB = 12;
const TEXTW = COLW - PADX * 2;
const GRID_TOP = 280;
const cellH = [];
for (const p of ITEMS) {
  const nh = await measureH(p.name, nameSize, nameFont.style, TEXTW);
  const mh = await measureH(p.meta, metaSize, metaFont.style, TEXTW);
  const ph = await measureH(p.price, priceSize, priceFont.style, TEXTW);
  cellH.push(Math.ceil(PADT + nh + 1 + mh + 6 + ph + PADB));
}
const rowH = [];
for (let r = 0; r < Math.ceil(ITEMS.length / 2); r++) {
  rowH.push(Math.max(cellH[r * 2], cellH[r * 2 + 1] || 0));
}
let gy = GRID_TOP;
for (let r = 0; r < rowH.length; r++) gy += rowH[r] + GAPY;
const gridBottom = gy - GAPY;
const card2 = frame.children.find((n) => n.type === "RECTANGLE" && n.y === 224 && n.width === 358);
const newCard2H = Math.ceil(gridBottom + 16 - 224);
const delta = newCard2H - 226;
for (const n of frame.children) if (n.y >= 466) n.y += delta;
card2.resize(358, newCard2H);
frame.resize(390, 800 + delta);
gy = GRID_TOP;
for (let r = 0; r < rowH.length; r++) {
  for (let c = 0; c < 2; c++) {
    const i = r * 2 + c;
    if (i >= ITEMS.length) break;
    const p = ITEMS[i];
    const cx = 32 + c * (COLW + GAPX);
    const selected = i === SELECTED;
    const rect = figma.createRectangle();
    rect.name = "Voucher " + p.name; rect.x = cx; rect.y = gy;
    rect.resize(COLW, rowH[r]);
    rect.fills = selected ? solid(T.soft) : cellFills;
    rect.strokes = selected ? solid(T.blue) : cellStrokes;
    rect.strokeWeight = selected ? 2 : cellStrokeW;
    rect.cornerRadius = cellRadius;
    frame.appendChild(rect);
    const nm = await newText(frame, "VoucherName " + p.name, cx + PADX, gy + PADT, p.name, nameSize, nameFont.style, "#000000", TEXTW);
    nm.fills = nameFills;
    const mt = await newText(frame, "VoucherMeta " + p.name, cx + PADX, gy + PADT + nm.height + 1, p.meta, metaSize, metaFont.style, T.sub, TEXTW);
    const pr = await newText(frame, "VoucherPrice " + p.name, cx + PADX, gy + PADT + nm.height + 1 + mt.height + 6, p.price, priceSize, priceFont.style, "#000000", TEXTW);
    pr.fills = priceFills;
  }
  gy += rowH[r] + GAPY;
}

// ---- harga pembayaran ringkas (base Rp216.000) + total ----
const payQRIS = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp22.000 · tanpa biaya");
await setText(payQRIS, "Rp216.000 · tanpa biaya");
const payDANA = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp22.250 · biaya Rp250");
await setText(payDANA, "Rp216.250 · biaya Rp250");
const total = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp22.000");
await setText(total, "Rp216.000", 100);

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, cellH, rowH, delta, newCard2H };
