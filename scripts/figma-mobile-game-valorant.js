// Builder frame Figma "Valorant" mobile (390px), diklon dari frame
// Produk Game mobile MLBB (1:208 Light / 1:314 Dark) lalu diubah isinya.
// Tahap 5 antrean kelengkapan katalog — game baru pertama dari 5
// (Valorant, CoD Mobile, Wild Rift, AoV, Delta Force).
// Isi mengikuti src/pages/GamePage.jsx (game valorant, needsZone: true,
// tanpa servers) + src/data.js (GAMES valorant: 1 tab "Points", 6 item,
// Terlaris 1000 Points Rp119.000) + CheckoutShell.
// Langkah: 1 User ID + Zone ID (dipertahankan dari MLBB — Valorant
// needsZone true, catatan contoh penulisan sudah persis kode),
// 2 Nominal (1 tab Points; grid 2 kolom 3 baris sesuai .nom-grid
// <=560px), 3 Jumlah, 4 Pembayaran (ringkas: QRIS + GoPay + DANA +
// catatan VA), 5 Detail Kontak, 6 Kode Promo, lalu bilah bawah.
// Contoh terpilih: 1000 Points Rp119.000 (Terlaris, sama seperti
// varian desktop Tahap 5 nanti), bayar QRIS (tanpa biaya).
// Harga dihitung lewat calcTotals data.js (node -e), bukan tangan:
// QRIS Rp119.000, GoPay/DANA Rp119.250 (fee 250), BCA VA Rp121.500
// (fee 2.500). Pulsa Rp127.330 hanya tampil di desktop (fee 7%).
// Geometri sumber diukur dari probe figma-probe-game-mobile.js
// (frame 390x1900): kartu Langkah 2 548 -> 300 (6 item, 3 baris),
// simpul di bawahnya geser -248, frame 1900 -> 1652.
const FRAME_NAME = "__NAME__";
const SRC_ID = "__SRC__";
const FX = __X__;
const FY = __Y__;

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

const ITEMS = [
  { name: "475 Points", price: "Rp59.000" },
  { name: "1000 Points", price: "Rp119.000", badge: "Terlaris" },
  { name: "2050 Points", price: "Rp239.000" },
  { name: "3650 Points", price: "Rp419.000" },
  { name: "5350 Points", price: "Rp599.000" },
  { name: "11000 Points", price: "Rp1.199.000" },
];
const SELECTED = 1; // 1000 Points Rp119.000

async function setText(node, str, width) {
  const segs = node.getStyledTextSegments(["fontName", "fontSize"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = str;
  if (width) { node.textAutoResize = "HEIGHT"; node.resize(width, node.height); }
}
async function measureNodeText(node, str) {
  const segs = node.getStyledTextSegments(["fontName", "fontSize"]);
  const fn = segs[0].fontName; const fs = segs[0].fontSize;
  const n = figma.createText();
  await figma.loadFontAsync(fn);
  n.fontName = fn; n.fontSize = fs; n.characters = str;
  const w = n.width; n.remove(); return { w, fontName: fn, fontSize: fs };
}

const src = figma.getNodeById(SRC_ID);
if (!src) throw new Error("frame sumber tidak ditemukan: " + SRC_ID);
const frame = src.clone();
frame.name = FRAME_NAME;
figma.currentPage.appendChild(frame);
frame.x = FX; frame.y = FY;

const byXY = (type, x, y) => frame.children.find((n) => n.type === type && Math.round(n.x) === Math.round(x) && Math.round(n.y) === Math.round(y));
const byXYW = (type, x, y, w) => frame.children.find((n) => n.type === type && Math.round(n.x) === Math.round(x) && Math.round(n.y) === Math.round(y) && Math.round(n.width) === Math.round(w));
const byChars = (str) => frame.children.find((n) => n.type === "TEXT" && n.characters === str);

// ---- header: tile + inisial + judul + sub ----
const tile = byXYW("RECTANGLE", 48, 14, 36);
if (!tile) throw new Error("tile header tidak ketemu");
tile.fills = solid("#475569"); // slate, warna game valorant di data.js
const ini = byXY("TEXT", 54, 24);
if (!ini || ini.characters !== "ML") throw new Error("teks inisial ML tidak ketemu");
await setText(ini, "VL");
const title = byXY("TEXT", 94, 16);
if (!title || title.characters !== "Mobile Legends") throw new Error("judul Mobile Legends tidak ketemu");
await setText(title, "Valorant");
const sub = byXY("TEXT", 94, 36);
if (!sub) throw new Error("sub header tidak ketemu");
{
  const m = await measureNodeText(sub, "Riot Games \u00b7 Via Riot ID + tag");
  await setText(sub, "Riot Games \u00b7 Via Riot ID + tag", Math.ceil(m.w) + 2);
  if (sub.x + sub.width > 318) throw new Error("sub Valorant menabrak Cek ID: right=" + (sub.x + sub.width));
}

// ---- tab Langkah 2: 3 tab -> 1 tab "Points" ----
const tabRect = byXYW("RECTANGLE", 32, 314, 78);
const tabText = byXY("TEXT", 43, 321);
if (!tabRect || !tabText || tabText.characters !== "Diamonds") throw new Error("tab Diamonds tidak ketemu");
{
  const m = await measureNodeText(tabText, "Points");
  const rw = Math.ceil(m.w) + 22;
  tabRect.resize(rw, 28);
  await setText(tabText, "Points");
  tabText.x = tabRect.x + 11;
}
for (const [rx, rw, label] of [[118, 99, "Weekly Pass"], [225, 113, "Twilight Pass"]]) {
  const r = byXYW("RECTANGLE", rx, 314, rw);
  const t = frame.children.find((n) => n.type === "TEXT" && n.characters === label);
  if (!r || !t) throw new Error("tab " + label + " tidak ketemu");
  r.remove(); t.remove();
}

// ---- grid nominal: 14 sel (7 baris) -> 6 sel (3 baris) ----
const cellRects = frame.children.filter((n) => n.type === "RECTANGLE" && Math.round(n.width) === 158 && Math.round(n.height) === 54 && (Math.round(n.x) === 32 || Math.round(n.x) === 200) && n.y >= 356 && n.y <= 782);
if (cellRects.length !== 14) throw new Error("sel grid ketemu " + cellRects.length + ", harap 14");
cellRects.sort((a, b) => (a.y - b.y) || (a.x - b.x));
const keep = cellRects.slice(0, 6);
const drop = cellRects.slice(6);
// gaya sel terpilih (dari sel 172 Diamonds lama) sebelum dihapus
const oldSel = byXYW("RECTANGLE", 200, 542, 158);
if (!oldSel) throw new Error("sel terpilih lama (172 Diamonds) tidak ketemu");
const selFills = JSON.parse(JSON.stringify(oldSel.fills));
const selStrokes = JSON.parse(JSON.stringify(oldSel.strokes));
const selStrokeWeight = oldSel.strokeWeight;
const selCorner = oldSel.cornerRadius;
// hapus sel baris 4-7 beserta teks nama/harga/meta di dalamnya.
// Badge Terlaris ditangkap DULU dan dikecualikan dari sapuan (teksnya
// berada di area sel 172 Diamonds yang ikut terhapus).
const badgeRect = byXYW("RECTANGLE", 306, 534, 42);
const badgeText = byXY("TEXT", 313, 536.5);
if (!badgeRect || !badgeText || badgeText.characters !== "Terlaris") throw new Error("badge Terlaris tidak ketemu");
for (const r of drop) {
  for (const n of frame.children) { // daftar segar tiap iterasi: simpul
    // yang dihapus di iterasi sebelumnya melempar saat dibaca
    if (n === r || n === badgeText) continue;
    if (n.x >= r.x && n.x < r.x + r.width && n.y >= r.y - 10 && n.y < r.y + r.height + 12) {
      if (n.type === "TEXT") n.remove();
    }
  }
  r.remove();
}
// badge -5% + coret lama dihapus (teksnya mungkin sudah ikut tersapu)
const discRect = byXYW("RECTANGLE", 306, 658, 42);
const discText = frame.children.find((n) => n.type === "TEXT" && n.characters === "-5%");
if (discRect) discRect.remove();
if (discText) discText.remove();
const wasText = byChars("Rp185.000");
if (wasText) wasText.remove();
// isi 6 sel baru (nama + harga), terapkan gaya terpilih ke sel SELECTED
const gridPos = [[32, 356], [200, 356], [32, 418], [200, 418], [32, 480], [200, 480]];
for (let i = 0; i < 6; i++) {
  const [cx, cy] = gridPos[i];
  const rect = keep.find((r) => Math.round(r.x) === cx && Math.round(r.y) === cy);
  if (!rect) throw new Error("sel grid (" + cx + "," + cy + ") tidak ketemu");
  const nameT = frame.children.find((n) => n.type === "TEXT" && Math.round(n.x) === cx + 12 && Math.round(n.y) === cy + 8);
  const priceT = frame.children.find((n) => n.type === "TEXT" && Math.round(n.x) === cx + 12 && Math.round(n.y) === cy + 30);
  if (!nameT || !priceT) throw new Error("teks sel (" + cx + "," + cy + ") tidak ketemu");
  await setText(nameT, ITEMS[i].name);
  await setText(priceT, ITEMS[i].price);
  nameT.name = ITEMS[i].name; priceT.name = ITEMS[i].price; rect.name = ITEMS[i].name;
  if (i === SELECTED) {
    rect.fills = selFills; rect.strokes = selStrokes; rect.strokeWeight = selStrokeWeight; rect.cornerRadius = selCorner;
    badgeRect.x = cx + 106; badgeRect.y = cy - 8;
    badgeText.x = badgeRect.x + (42 - badgeText.width) / 2;
    badgeText.y = badgeRect.y + 2.5;
  }
}
// Badge harus di depan sel: sel baris 1-3 (126:x, dibuat Siklus 50)
// berada sesudah badge di urutan anak, jadi tanpa ini teks badge
// tertutup fill sel di bawah tepi atasnya (terlihat di screenshot v1).
frame.appendChild(badgeRect);
frame.appendChild(badgeText);

// ---- kartu Langkah 2 menyusut + geser simpul di bawahnya ----
const step2Card = byXYW("RECTANGLE", 16, 262, 358);
if (!step2Card || Math.round(step2Card.height) !== 548) throw new Error("kartu Langkah 2 tidak ketemu / tinggi bukan 548");
step2Card.resize(358, 300);
const DY = -248;
for (const n of [...frame.children]) {
  if (n.y >= 826) n.y += DY;
}
frame.resize(390, 1900 + DY);

// ---- Langkah 4: harga metode dari base Rp119.000 ----
async function setPriceRight(x, y, str, rightEdge) {
  const t = byXY("TEXT", x, y);
  if (!t) throw new Error("teks harga (" + x + "," + y + ") tidak ketemu");
  const m = await measureNodeText(t, str);
  await setText(t, str, Math.ceil(m.w) + 1);
  t.x = rightEdge - t.width;
  return t;
}
await setPriceRight(296, 1026 + DY, "Rp119.000", 357); // QRIS
await setPriceRight(296, 1080 + DY, "Rp119.250", 357); // GoPay
await setPriceRight(296, 1134 + DY, "Rp119.250", 357); // DANA
const vaNote = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Virtual Account") === 0);
if (!vaNote) throw new Error("catatan VA tidak ketemu");
await setText(vaNote, "Virtual Account \u00b7 BCA Rp121.500 (biaya Rp2.500) \u00b7 Danamon: lagi perbaikan", 326);
let extraDY = 0;
if (vaNote.height > 26) {
  extraDY = vaNote.height - 26;
  const step4Card = byXYW("RECTANGLE", 16, 938 + DY, 358);
  if (step4Card) step4Card.resize(358, step4Card.height + extraDY);
  for (const n of [...frame.children]) {
    if (n.y >= 1222 + DY) n.y += extraDY;
  }
  frame.resize(390, frame.height + extraDY);
}

// ---- bilah bawah: Harga / Total / ringkasan ----
await setPriceRight(300, 1804 + DY + extraDY, "Rp119.000", 355); // Harga
await setPriceRight(286, 1838 + DY + extraDY, "Rp119.000", 359); // Total
const summary = byXY("TEXT", 16, 1868 + DY + extraDY);
if (!summary) throw new Error("ringkasan bilah bawah tidak ketemu");
await setText(summary, "1000 Points \u00b7 QRIS");

return {
  frameId: frame.id, frameName: frame.name, x: frame.x, y: frame.y,
  w: frame.width, h: frame.height,
  keptCells: 6, droppedCells: drop.length, deltaY: DY, extraDY,
  subRight: +(sub.x + sub.width).toFixed(1), subH: sub.height,
  vaNoteH: vaNote.height,
  badgeAt: [badgeRect.x, badgeRect.y],
};
