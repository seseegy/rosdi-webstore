// Builder frame Figma "Paket Data Telkomsel" mobile (390px), diklon dari
// frame Pulsa mobile (2:2 Light / 2:59 Dark) lalu diubah isinya.
// Dijalankan lewat use_figma; placeholder __NAME__/__SRC__/__X__/__Y__/
// __TOKENS__ diisi driver sebelum dikirim. Token mengikuti sistem desain.
// Isi mengikuti src/pages/PhonePages.jsx (mode data) + src/data.js
// (DATA_PACKAGES.telkomsel, 5 paket) + CheckoutShell.
// Langkah: 1 Nomor HP, 2 Pilih Paket, 3 Pembayaran, 4 Kontak, 5 Promo
// (qtyEnabled=false, sama seperti pulsa).
// Contoh terpilih: Internet Sakti 15GB Rp46.000, bayar QRIS (tanpa biaya).
// Fee: GoPay +Rp250 -> Rp46.250; BCA VA +Rp2.500 -> Rp48.500.
// Grid nominal di kode 2 kolom pada <=560px (.nom-grid), jadi sel paket
// 2 kolom (158px) dengan tinggi diukur dari teks (nama/meta bisa 2 baris).
const T = __TOKENS__;
const FRAME_NAME = "__NAME__";
const SRC_ID = "__SRC__";
const FX = __X__;
const FY = __Y__;

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

const PKGS = [
  { name: "Internet Sakti 15GB", price: "Rp46.000", meta: "Kuota utama 15GB · 30 hari" },
  { name: "Internet Sakti 30GB", price: "Rp69.000", meta: "Kuota utama 30GB · 30 hari" },
  { name: "OMG! Nonton 10GB", price: "Rp38.000", meta: "Kuota streaming 10GB · 30 hari" },
  { name: "Internet Mingguan 7GB", price: "Rp24.000", meta: "Kuota utama 7GB · 7 hari" },
  { name: "GamesMax Booster MLBB", price: "Rp32.000", meta: "Kuota game + 30 DM · 30 hari" },
];

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
const oldCells = frame.children.filter((n) => n.type === "RECTANGLE" && n.width === 104 && (n.y === 294 || n.y === 356));
const oldName = frame.children.find((n) => n.type === "TEXT" && n.y === 302);
const oldPrice = frame.children.find((n) => n.type === "TEXT" && n.y === 324);
if (oldCells.length !== 6 || !oldName || !oldPrice) throw new Error("struktur frame sumber tidak seperti diduga: cells=" + oldCells.length);
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

// ---- hapus 6 sel pulsa lama (rect + teks nama + harga) ----
for (const n of frame.children.filter((n) => (n.type === "RECTANGLE" && n.width === 104 && (n.y === 294 || n.y === 356)) || (n.type === "TEXT" && (n.y === 302 || n.y === 324 || n.y === 364 || n.y === 386)))) n.remove();

// ---- judul + sub + judul langkah 2 + catatan langkah 2 ----
const title = frame.children.find((n) => n.type === "TEXT" && n.characters === "Pulsa Telkomsel");
await setText(title, "Paket Data Telkomsel", 180);
const sub = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Pulsa reguler") === 0);
await setText(sub, "Paket data · aktif otomatis", 220);
const step2Title = frame.children.find((n) => n.type === "TEXT" && n.characters === "Pilih Nominal");
await setText(step2Title, "Pilih Paket");
const step2Note = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Nominal tampil penuh") === 0);
await setText(step2Note, "Paket tampil penuh dengan harga — tanpa harus isi nomor dulu.", 326);

// ---- sel paket baru (2 kolom, tinggi terukur) ----
// PENTING: geser simpul lama dulu (langkah 3 + bilah bawah, y>=460)
// SEBELUM membuat sel baru — sel baris bawah & catatan juga punya y>=460
// dan akan ikut tergeser bila urutannya dibalik (cacat Siklus 21 awal).
const COLW = 158, GAPX = 10, GAPY = 10, PADX = 13, PADT = 12, PADB = 12;
const TEXTW = COLW - PADX * 2;
const GRID_TOP = 294;
const cellH = [];
for (const p of PKGS) {
  const nh = await measureH(p.name, nameSize, nameFont.style, TEXTW);
  const mh = await measureH(p.meta, 11.5, "Regular", TEXTW);
  const ph = await measureH(p.price, priceSize, priceFont.style, TEXTW);
  cellH.push(Math.ceil(PADT + nh + 1 + mh + 6 + ph + PADB));
}
const rowH = [];
for (let r = 0; r < Math.ceil(PKGS.length / 2); r++) {
  rowH.push(Math.max(cellH[r * 2], cellH[r * 2 + 1] || 0));
}
let gy = GRID_TOP;
for (let r = 0; r < rowH.length; r++) gy += rowH[r] + GAPY;
const gridBottom = gy - GAPY;
const noteY = gridBottom + 16;
const card2 = frame.children.find((n) => n.type === "RECTANGLE" && n.y === 238 && n.width === 358);
const newCard2H = Math.ceil(noteY + step2Note.height + 16 - 238);
const delta = newCard2H - 206;
for (const n of frame.children) if (n.y >= 460) n.y += delta;
card2.resize(358, newCard2H);
frame.resize(390, 1064 + delta);
gy = GRID_TOP;
for (let r = 0; r < rowH.length; r++) {
  for (let c = 0; c < 2; c++) {
    const i = r * 2 + c;
    if (i >= PKGS.length) break;
    const p = PKGS[i];
    const cx = 32 + c * (COLW + GAPX);
    const selected = i === 0;
    const rect = figma.createRectangle();
    rect.name = "Paket " + p.name; rect.x = cx; rect.y = gy;
    rect.resize(COLW, rowH[r]);
    rect.fills = selected ? solid(T.soft) : cellFills;
    rect.strokes = selected ? solid(T.blue) : cellStrokes;
    rect.strokeWeight = selected ? 2 : cellStrokeW;
    rect.cornerRadius = cellRadius;
    frame.appendChild(rect);
    const nm = await newText(frame, "PaketName " + p.name, cx + PADX, gy + PADT, p.name, nameSize, nameFont.style, "#000000", TEXTW);
    nm.fills = nameFills;
    const mt = await newText(frame, "PaketMeta " + p.name, cx + PADX, gy + PADT + nm.height + 1, p.meta, 11.5, "Regular", T.sub, TEXTW);
    const pr = await newText(frame, "PaketPrice " + p.name, cx + PADX, gy + PADT + nm.height + 1 + mt.height + 6, p.price, priceSize, priceFont.style, "#000000", TEXTW);
    pr.fills = priceFills;
  }
  gy += rowH[r] + GAPY;
}
step2Note.y = noteY;

// ---- harga pembayaran (base Rp46.000) + total ----
const payQRIS = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp51.907 · tanpa biaya");
await setText(payQRIS, "Rp46.000 · tanpa biaya");
const payGP = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp52.157 · biaya Rp250");
await setText(payGP, "Rp46.250 · biaya Rp250");
const payVA = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp54.407 · biaya Rp2.500");
await setText(payVA, "Rp48.500 · biaya Rp2.500");
const total = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp51.907");
await setText(total, "Rp46.000");

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, cellH, rowH, delta, newCard2H };
