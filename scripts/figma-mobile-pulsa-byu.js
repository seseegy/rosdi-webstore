// Builder frame Figma "Pulsa by.U" mobile (390px), diklon dari frame
// Pulsa mobile (2:2 Light / 2:59 Dark) lalu diubah isinya.
// Isi mengikuti src/pages/PhonePages.jsx (mode pulsa, operator by.U,
// transfer tersedia) + src/pages/CheckoutShell.jsx + src/data.js
// (OPERATORS byu: 11 nominal reguler, tab Reguler/Transfer).
// Langkah: 1 Nomor HP (contoh 0851..., catatan deteksi by.U),
// 2 Nominal (tab Reguler aktif / Transfer; grid 2 kolom 11 item),
// 3 Pembayaran (ringkas: QRIS + GoPay + BCA VA),
// 4 Detail Kontak + 5 Kode Promo (teks pola halaman produk),
// lalu bilah bawah. Contoh terpilih: Pulsa 50.000 Rp51.600,
// bayar QRIS (tanpa biaya) — sama seperti Telkomsel (Rp51.907).
// Harga dihitung lewat calcTotals data.js (node -e), bukan tangan:
// QRIS Rp51.600, GoPay Rp51.850 (fee 250), BCA VA Rp54.100 (fee 2.500).
// Tab Reguler/Transfer: gaya diambil dari frame Produk Game mobile
// MLBB (1:208) — tab aktif + tab tak aktif — bukan gaya baru.
const FRAME_NAME = "__NAME__";
const SRC_ID = "__SRC__";
const FX = __X__;
const FY = __Y__;

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

// Harga reguler by.U (data.js OPERATORS byu), urutan grid baris-per-baris.
const PRICES = [
  "Rp6.400", "Rp12.100",
  "Rp16.600", "Rp21.600",
  "Rp26.600", "Rp31.600",
  "Rp51.600", "Rp74.600",
  "Rp97.600", "Rp148.500",
  "Rp197.500",
];
const ROWS_Y = [294, 356, 418, 480, 542, 604];
const COLS_X = [32, 200];

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
const byChars = (str) => frame.children.find((n) => n.type === "TEXT" && n.characters === str);

// ---- gaya tab dari frame Produk Game mobile MLBB (1:208) ----
const mlbb = figma.getNodeById("1:208");
if (!mlbb) throw new Error("frame MLBB 1:208 tidak ditemukan");
const tabActRect = mlbb.children.find((n) => n.type === "RECTANGLE" && Math.round(n.x) === 32 && Math.round(n.y) === 314);
const tabActText = mlbb.children.find((n) => n.type === "TEXT" && Math.round(n.y) === 321 && Math.round(n.x) < 118);
const tabInRect = mlbb.children.find((n) => n.type === "RECTANGLE" && Math.round(n.x) === 118 && Math.round(n.y) === 314 && Math.round(n.width) === 99);
const tabInText = mlbb.children.find((n) => n.type === "TEXT" && Math.round(n.x) === 129 && Math.round(n.y) === 321);
if (!tabActRect || !tabActText || !tabInRect || !tabInText) throw new Error("tab MLBB tidak ditemukan");
const tabActFills = tabActRect.fills, tabActStrokes = tabActRect.strokes, tabActStrokeW = tabActRect.strokeWeight, tabActRadius = tabActRect.cornerRadius;
const tabActFont = tabActText.fontName, tabActSize = tabActText.fontSize, tabActTextFills = tabActText.fills;
const tabInFills = tabInRect.fills, tabInStrokes = tabInRect.strokes, tabInStrokeW = tabInRect.strokeWeight, tabInRadius = tabInRect.cornerRadius;
const tabInFont = tabInText.fontName, tabInSize = tabInText.fontSize, tabInTextFills = tabInText.fills;

// ---- header: tile BU biru gelap + judul + sub ----
const tileRect = byXYW("RECTANGLE", 48, 14, 36);
tileRect.fills = solid("#1e3a8a");
const tileText = frame.children.find((n) => n.type === "TEXT" && n.characters === "TS");
await setText(tileText, "BU");
const title = frame.children.find((n) => n.type === "TEXT" && n.characters === "Pulsa Telkomsel");
await setText(title, "Pulsa by.U", 117);
// Sub mengikuti konvensi pemendekan frame Pulsa mobile ("hitungan"
// dihilangkan seperti frame Telkomsel) agar tetap 1 baris di lebar 280.
const sub = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Pulsa reguler") === 0);
await setText(sub, "Pulsa reguler & transfer · masuk dalam detik", 280);
if (sub.x + sub.width > 374) throw new Error("sub meluber: x+w=" + (sub.x + sub.width));

// ---- langkah 1: nomor contoh by.U + catatan deteksi ----
const inputText = byChars("0812 3456 7890");
await setText(inputText, "0851 2345 6789");
const note1 = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Operator terdeteksi:") === 0);
await setText(note1, "Operator terdeteksi: by.U.");

// ---- harga grid: 11 harga reguler by.U (nama sel tidak berubah) ----
for (let i = 0; i < 11; i++) {
  const r = Math.floor(i / 2), c = i % 2;
  const px = COLS_X[c] + 12, py = ROWS_Y[r] + 30;
  const priceNode = byXY("TEXT", px, py);
  if (!priceNode) throw new Error("teks harga tidak ditemukan di " + px + "," + py);
  await setText(priceNode, PRICES[i]);
}

// ---- langkah 3 ringkas: harga bayar base Rp51.600 ----
const payQRIS = byChars("Rp51.907 · tanpa biaya");
await setText(payQRIS, "Rp51.600 · tanpa biaya");
const payGoPay = byChars("Rp52.157 · biaya Rp250");
await setText(payGoPay, "Rp51.850 · biaya Rp250");
const payBCA = byChars("Rp54.407 · biaya Rp2.500");
await setText(payBCA, "Rp54.100 · biaya Rp2.500");

// ---- bilah bawah: total ----
const barTotal = byChars("Rp51.907");
await setText(barTotal, "Rp51.600");

// ---- sisipkan baris tab (Reguler aktif / Transfer), geser grid +30 ----
// Urutan: geser simpul lama dulu (grid + kartu 2 + semua di bawahnya),
// baru buat tab — pola perbaikan PLN Siklus 29 / FF Siklus 46.
const DELTA = 30;
for (const n of frame.children) if (n.y >= 294) n.y += DELTA;
const card2 = byXYW("RECTANGLE", 16, 238, 358);
card2.resize(358, 476 + DELTA);
frame.resize(390, 1312 + DELTA);

const TABY = 286, TABH = 28;
const regW = Math.ceil(await measureW("Reguler", tabActSize, tabActFont.style)) + 22;
const trW = Math.ceil(await measureW("Transfer", tabInSize, tabInFont.style)) + 22;
const regRect = figma.createRectangle();
regRect.name = "Tab Reguler"; regRect.x = 32; regRect.y = TABY;
regRect.resize(regW, TABH);
regRect.fills = tabActFills; regRect.strokes = tabActStrokes;
regRect.strokeWeight = tabActStrokeW; regRect.cornerRadius = tabActRadius;
frame.appendChild(regRect);
const regText = await newText(frame, "Reguler", 0, TABY + 7, "Reguler", tabActSize, tabActFont.style, "#000000", regW - 22);
regText.fills = tabActTextFills;
regText.x = 32 + (regW - regText.width) / 2;
const trRect = figma.createRectangle();
trRect.name = "Tab Transfer"; trRect.x = 32 + regW + 8; trRect.y = TABY;
trRect.resize(trW, TABH);
trRect.fills = tabInFills; trRect.strokes = tabInStrokes;
trRect.strokeWeight = tabInStrokeW; trRect.cornerRadius = tabInRadius;
frame.appendChild(trRect);
const trText = await newText(frame, "Transfer", 0, TABY + 7, "Transfer", tabInSize, tabInFont.style, "#000000", trW - 22);
trText.fills = tabInTextFills;
trText.x = 32 + regW + 8 + (trW - trText.width) / 2;

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, delta: DELTA, tabW: [regW, trW], subW: Math.round(sub.width), subRight: Math.round(sub.x + sub.width) };
