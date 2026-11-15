// Builder frame Figma "PLN Pascabayar" mobile (390px), diklon dari
// frame Token PLN mobile (2:116 Light / 2:181 Dark) lalu diubah isinya.
// Dijalankan lewat use_figma; placeholder __NAME__/__SRC__/__X__/__Y__/
// __TOKENS__ diisi driver sebelum dikirim. Token mengikuti sistem desain.
// Isi mengikuti src/pages/BillPages.jsx (BillPage pln-pascabayar) +
// src/data.js (BILLS[0], billItem, BILL_ADMIN) + CheckoutShell.
// Langkah: 1 Masukkan Nomor Tagihan (input + Cek Tagihan + rincian 6 baris
// + catatan hijau), 2 Pilih Tagihan (1 item), 3 Pembayaran (ringkas: QRIS
// + DANA + Alfamart, seperti frame PLN mobile asal), lalu catatan generik
// langkah 4/5 + bilah bawah (pola frame Pulsa mobile).
// Contoh terpilih: Tagihan Oktober 2026 Rp189.900, bayar QRIS (tanpa biaya).
// Harga dihitung lewat calcTotals data.js (node -e), bukan tangan:
// QRIS Rp189.900, DANA Rp190.150 (+250), Alfamart Rp192.400 (+2.500).
// Nama pelanggan maskName("543210987654") = "S*T* *MIN*H" (node -e).
// Grid nominal di kode 2 kolom pada <=560px; 1 item = 1 sel 158px, tinggi
// diukur dari teks (nama + meta bisa 2 baris).
const T = __TOKENS__;
const FRAME_NAME = "__NAME__";
const SRC_ID = "__SRC__";
const FX = __X__;
const FY = __Y__;

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

const ROWS = [
  ["Nama pelanggan", "S*T* *MIN*H"],
  ["Periode", "Oktober 2026"],
  ["Rincian", "Pemakaian 142 kWh · R1 / 1300 VA"],
  ["Tagihan", "Rp187.400"],
  ["Biaya admin", "Rp2.500"],
  ["Total tagihan", "Rp189.900"],
];
const NOTE_GOOD = "Tagihan ditemukan. Periksa nama & periode sebelum membayar — tagihan yang sudah dibayar tidak bisa dibatalkan.";
const ITEM = { name: "Tagihan Oktober 2026", price: "Rp189.900", meta: "Tagihan Rp187.400 + admin Rp2.500" };

async function setText(node, str, width, lineHeight) {
  const segs = node.getStyledTextSegments(["fontName", "fontSize"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = str;
  if (width) { node.textAutoResize = "HEIGHT"; node.resize(width, node.height); }
  if (lineHeight) node.lineHeight = { unit: "PIXELS", value: lineHeight };
}
async function newText(parent, name, x, y, str, size, weight, color, opts) {
  opts = opts || {};
  const n = figma.createText();
  n.name = name; n.x = x; n.y = y;
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.fills = solid(color); n.characters = str;
  if (opts.lineHeight) n.lineHeight = { unit: "PIXELS", value: opts.lineHeight };
  if (opts.width) { n.textAutoResize = "HEIGHT"; n.resize(opts.width, n.height); }
  if (opts.align) n.textAlignHorizontal = opts.align;
  parent.appendChild(n); return n;
}
async function measureH(str, size, weight, width, lineHeight) {
  const n = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.characters = str;
  if (lineHeight) n.lineHeight = { unit: "PIXELS", value: lineHeight };
  n.textAutoResize = "HEIGHT"; n.resize(width, n.height);
  const h = n.height; n.remove(); return h;
}
function findText(frame, chars) {
  return frame.children.find((n) => n.type === "TEXT" && n.characters === chars);
}

const src = figma.getNodeById(SRC_ID);
if (!src) throw new Error("frame sumber tidak ditemukan: " + SRC_ID);
const frame = src.clone();
frame.name = FRAME_NAME;
figma.currentPage.appendChild(frame);
frame.x = FX; frame.y = FY;

// ---- tangkap gaya sel nominal lama sebelum dihapus ----
const oldCells = frame.children.filter((n) => n.type === "RECTANGLE" && n.width === 158 && (n.y === 314 || n.y === 376 || n.y === 438));
const oldName = frame.children.find((n) => n.type === "TEXT" && n.y === 322);
const oldPrice = frame.children.find((n) => n.type === "TEXT" && n.y === 340);
const oldMeta = frame.children.find((n) => n.type === "TEXT" && n.y === 355);
if (oldCells.length !== 6 || !oldName || !oldPrice || !oldMeta) throw new Error("struktur frame sumber tidak seperti diduga: cells=" + oldCells.length);
const cellRadius = oldCells[0].cornerRadius;
const nameFont = oldName.fontName;
const nameSize = oldName.fontSize;
const nameFills = oldName.fills;
const priceFont = oldPrice.fontName;
const priceSize = oldPrice.fontSize;
const priceFills = oldPrice.fills;
const metaFont = oldMeta.fontName;
const metaSize = oldMeta.fontSize;

// ---- hapus 6 sel Token PLN lama (rect + teks nama + harga + meta) ----
// PENTING: hapus dulu SEBELUM geser simpul (cacat Siklus 21).
for (const n of frame.children.filter((n) =>
  (n.type === "RECTANGLE" && n.width === 158 && (n.y === 314 || n.y === 376 || n.y === 438)) ||
  (n.type === "TEXT" && (n.y === 322 || n.y === 340 || n.y === 355 || n.y === 384 || n.y === 402 || n.y === 417 || n.y === 446 || n.y === 464 || n.y === 479)))) n.remove();

// ---- header: judul + sub ----
const title = findText(frame, "Token PLN");
if (!title) throw new Error("judul Token PLN tidak ditemukan");
await setText(title, "PLN Pascabayar");
const sub = findText(frame, "Prabayar · nama dicek sebelum bayar");
if (!sub) throw new Error("sub PLN tidak ditemukan");
await setText(sub, "Pascabayar · cek tagihan dulu, bayar sebelum jatuh tempo", 280);
const subH = sub.height;

// ---- Langkah 1: judul, input, tombol, hapus catatan lama ----
const step1Title = findText(frame, "Masukkan ID Pelanggan");
if (!step1Title) throw new Error("judul langkah 1 tidak ditemukan");
await setText(step1Title, "Masukkan Nomor Tagihan");
const inputRect = frame.children.find((n) => n.type === "RECTANGLE" && n.x === 32 && n.y === 140 && n.width === 238);
if (!inputRect) throw new Error("rect input tidak ditemukan");
inputRect.resize(208, 42);
const inputText = findText(frame, "51234567890");
if (!inputText) throw new Error("teks input tidak ditemukan");
await setText(inputText, "543210987654");
const btnRect = frame.children.find((n) => n.type === "RECTANGLE" && n.x === 278 && n.y === 140 && n.width === 80);
if (!btnRect) throw new Error("rect tombol tidak ditemukan");
btnRect.x = 248; btnRect.resize(110, 42);
const btnText = findText(frame, "Cek Nama");
if (!btnText) throw new Error("teks tombol tidak ditemukan");
await setText(btnText, "Cek Tagihan");
btnText.x = 248 + (110 - btnText.width) / 2;
const oldNote1 = findText(frame, "Nama: R*SY*D R*M*DH*N* · Tarif R1/1300 VA");
const oldNote2 = findText(frame, "Pastikan nama sesuai — token terbit tidak bisa dibatalkan.");
if (!oldNote1 || !oldNote2) throw new Error("catatan langkah 1 lama tidak ditemukan");
oldNote1.remove(); oldNote2.remove();

// ---- Langkah 1: rincian 6 baris + catatan hijau (tinggi terukur) ----
const noteH = await measureH(NOTE_GOOD, 12.5, "Regular", 326, 19);
const rowsTop = 84 + 114;
const rowsBottom = rowsTop + (ROWS.length - 1) * 19 + 15;
const noteY = rowsBottom + 12;
const newStep1H = Math.ceil(noteY + noteH - 84) + 16;
const delta1 = newStep1H - 158;
const step1Card = frame.children.find((n) => n.type === "RECTANGLE" && n.x === 16 && n.y === 84 && n.width === 358);
if (!step1Card) throw new Error("kartu langkah 1 tidak ditemukan");
step1Card.resize(358, newStep1H);
// Geser simpul lama di bawah langkah 1 SEBELUM membuat simpul baru.
for (const n of frame.children) if (n.y >= 258) n.y += delta1;
// Baru buat baris rincian + catatan (simpul baru, posisi absolut).
for (let i = 0; i < ROWS.length; i++) {
  const ry = rowsTop + i * 19;
  await newText(frame, "BillRowLab " + ROWS[i][0], 32, ry, ROWS[i][0], 12.5, "Regular", T.sub);
  await newText(frame, "BillRowVal " + ROWS[i][0], 148, ry, ROWS[i][1], 12.5, "Semi Bold", T.ink, { width: 210, align: "RIGHT" });
}
await newText(frame, "BillNoteGood", 32, noteY, NOTE_GOOD, 12.5, "Regular", T.green, { width: 326, lineHeight: 19 });

// ---- Langkah 2: judul + 1 sel tagihan (tinggi terukur) ----
const step2Title = findText(frame, "Pilih Nominal Token");
if (!step2Title) throw new Error("judul langkah 2 tidak ditemukan");
await setText(step2Title, "Pilih Tagihan");
const TEXTW = 158 - 13 * 2;
const nameH = await measureH(ITEM.name, nameSize, nameFont.style, TEXTW);
const metaH = await measureH(ITEM.meta, metaSize, metaFont.style, TEXTW);
const priceH = await measureH(ITEM.price, priceSize, priceFont.style, TEXTW);
const cellH = Math.ceil(12 + nameH + 1 + metaH + 6 + priceH + 12);
const step2Y = 258 + delta1;
const cellY = step2Y + 56;
const rect = figma.createRectangle();
rect.name = "Bill " + ITEM.name; rect.x = 32; rect.y = cellY;
rect.resize(158, cellH);
rect.fills = solid(T.soft);
rect.strokes = solid(T.blue);
rect.strokeWeight = 2;
rect.cornerRadius = cellRadius;
frame.appendChild(rect);
const nm = await newText(frame, "BillName " + ITEM.name, 32 + 13, cellY + 12, ITEM.name, nameSize, nameFont.style, "#000000", { width: TEXTW });
nm.fills = nameFills;
const mt = await newText(frame, "BillMeta " + ITEM.name, 32 + 13, cellY + 12 + nm.height + 1, ITEM.meta, metaSize, metaFont.style, T.sub, { width: TEXTW });
const pr = await newText(frame, "BillPrice " + ITEM.name, 32 + 13, cellY + 12 + nm.height + 1 + mt.height + 6, ITEM.price, priceSize, priceFont.style, "#000000", { width: TEXTW });
pr.fills = priceFills;
const newStep2H = Math.ceil(56 + cellH + 16);
const delta2 = newStep2H - 250;
const step2Card = frame.children.find((n) => n.type === "RECTANGLE" && n.x === 16 && n.y === step2Y && n.width === 358);
if (!step2Card) throw new Error("kartu langkah 2 tidak ditemukan");
step2Card.resize(358, newStep2H);
// Geser simpul di bawah langkah 2 (kartu langkah 3 + catatan + bilah bawah).
for (const n of frame.children) if (n.y >= 524 + delta1) n.y += delta2;

// ---- Langkah 3: harga pembayaran ringkas + catatan generik ----
const payQRIS = findText(frame, "Rp52.500 · tanpa biaya");
if (!payQRIS) throw new Error("harga QRIS tidak ditemukan");
await setText(payQRIS, "Rp189.900 · tanpa biaya");
const payDANA = findText(frame, "Rp52.750 · biaya Rp250");
if (!payDANA) throw new Error("harga DANA tidak ditemukan");
await setText(payDANA, "Rp190.150 · biaya Rp250");
const payALF = findText(frame, "Rp55.000 · biaya Rp2.500");
if (!payALF) throw new Error("harga Alfamart tidak ditemukan");
await setText(payALF, "Rp192.400 · biaya Rp2.500");
const step3Note = findText(frame, "Nomor token 20 digit tampil di halaman sukses setelah pembayaran.");
if (!step3Note) throw new Error("catatan langkah 3 tidak ditemukan");
await setText(step3Note, "Langkah 4 kontak dan 5 kode promo mengikuti pola halaman produk.");

// ---- Bilah bawah: total ----
const total = findText(frame, "Rp52.500");
if (!total) throw new Error("total bilah bawah tidak ditemukan");
await setText(total, "Rp189.900");
total.x = 358 - total.width;

const barY = 1012 + delta1 + delta2;
frame.resize(390, barY + 96);

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, subH, noteH, cellH, nameH, metaH, delta1, delta2, newStep1H, newStep2H, barY };
