// Fix Siklus 128 (Tahap 5): propagasi DATA_PACKAGES 10 paket ke frame
// "Paket Data Telkomsel" mobile — 5 paket lama + 5 paket baru dari data.js.
// Dijalankan lewat use_figma; placeholder __FRAME__ diisi driver.
// Pola builder figma-mobile-data.js Siklus 21: sel 2 kolom 158px, tinggi
// diukur dari teks (nama/meta/harga), geser simpul lama DULU baru buat sel
// baru (pelajaran Siklus 21), klon sel tak-terpilih agar gaya persis.
const FRAME_ID = "__FRAME__";

const NEW_PKGS = [
  { name: "Internet Sakti 5GB", price: "Rp18.000", meta: "Kuota utama 5GB · 30 hari" },
  { name: "Internet Sakti 60GB", price: "Rp99.000", meta: "Kuota utama 60GB · 30 hari" },
  { name: "Internet Lokal 25GB", price: "Rp52.000", meta: "Kuota lokal 25GB · 30 hari" },
  { name: "Internet Malam 30GB", price: "Rp29.000", meta: "Kuota malam 30GB · 30 hari (00.00–07.00)" },
  { name: "Unlimited Apps 7 Hari", price: "Rp55.000", meta: "Kuota utama 5GB + unlimited aplikasi · 7 hari" },
];

async function setText(node, str, width) {
  const segs = node.getStyledTextSegments(["fontName", "fontSize"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = str;
  if (width) { node.textAutoResize = "HEIGHT"; node.resize(width, node.height); }
}
async function measureH(str, size, style, width) {
  const n = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style });
  n.fontName = { family: "Inter", style };
  n.fontSize = size; n.characters = str;
  n.textAutoResize = "HEIGHT"; n.resize(width, n.height);
  const h = n.height; n.remove(); return h;
}

const frame = figma.getNodeById(FRAME_ID);
if (!frame) throw new Error("frame tidak ditemukan: " + FRAME_ID);
const kids = () => frame.children;

// ---- tangkap struktur lama (dinamis, tanpa hardcode id simpul) ----
const card2 = kids().find((n) => n.type === "RECTANGLE" && n.width === 358 && Math.round(n.y) === 238);
if (!card2) throw new Error("kartu Langkah 2 tidak ditemukan");
const card2Y = Math.round(card2.y), card2H = Math.round(card2.height);
const note = kids().find((n) => n.type === "TEXT" && n.characters.indexOf("Paket tampil penuh") === 0);
if (!note) throw new Error("catatan Langkah 2 tidak ditemukan");
const step3Card = kids().find((n) => n.type === "RECTANGLE" && n.width === 358 && Math.round(n.y) === 662);
if (!step3Card) throw new Error("kartu Langkah 3 tidak ditemukan");
const step3Y = Math.round(step3Card.y);

// sel templat tak-terpilih: "Paket Internet Sakti 30GB" (baris 1 kanan)
const tplRect = kids().find((n) => n.type === "RECTANGLE" && n.name === "Paket Internet Sakti 30GB");
const tplName = kids().find((n) => n.type === "TEXT" && n.name === "PaketName Internet Sakti 30GB");
const tplMeta = kids().find((n) => n.type === "TEXT" && n.name === "PaketMeta Internet Sakti 30GB");
const tplPrice = kids().find((n) => n.type === "TEXT" && n.name === "PaketPrice Internet Sakti 30GB");
if (!tplRect || !tplName || !tplMeta || !tplPrice) throw new Error("sel templat tidak ditemukan");
const nameSize = tplName.fontSize, nameStyle = tplName.fontName.style;
const metaSize = tplMeta.fontSize, metaStyle = tplMeta.fontName.style;
const priceSize = tplPrice.fontSize, priceStyle = tplPrice.fontName.style;

// geometri grid lama: baris 1 y=294 h=87, baris 2 y=391 h=87, baris 3 y=488 h=100
const COLW = 158, GAPY = 10, PADX = 13, PADT = 12, PADB = 12;
const TEXTW = COLW - PADX * 2;
const ROW2_Y = 488, ROW2_H = 100;

// ---- ukur 5 sel baru ----
const cellH = [];
for (const p of NEW_PKGS) {
  const nh = await measureH(p.name, nameSize, nameStyle, TEXTW);
  const mh = await measureH(p.meta, metaSize, metaStyle, TEXTW);
  const ph = await measureH(p.price, priceSize, priceStyle, TEXTW);
  cellH.push(Math.ceil(PADT + nh + 1 + mh + 6 + ph + PADB));
}
// baris 3 (idx 2) menampung paket 6 di kolom kanan; baris 4 = paket 7,8; baris 5 = paket 9,10
const row2H = Math.max(ROW2_H, cellH[0]);
const row3H = Math.max(cellH[1], cellH[2]);
const row4H = Math.max(cellH[3], cellH[4]);
const row3Y = ROW2_Y + row2H + GAPY;
const row4Y = row3Y + row3H + GAPY;
const gridBottom = row4Y + row4H;
const noteY = gridBottom + 16;
const newCard2H = Math.ceil(noteY + note.height + 16 - card2Y);
const delta = newCard2H - card2H;
if (delta <= 0) throw new Error("delta tidak positif: " + delta);

// ---- geser simpul lama dulu (kartu Langkah 3 ke bawah), baru buat sel ----
for (const n of kids()) if (Math.round(n.y) >= step3Y) n.y += delta;
card2.resize(358, newCard2H);
note.y = noteY;

// ---- buat 5 sel baru (klon templat tak-terpilih) ----
const placed = [];
function makeCell(p, cx, gy, h) {
  const r = tplRect.clone();
  r.name = "Paket " + p.name; r.x = cx; r.y = gy; r.resize(COLW, h);
  frame.appendChild(r);
  return r;
}
async function makeTexts(p, cx, gy) {
  const nm = tplName.clone();
  nm.name = "PaketName " + p.name; nm.x = cx + PADX; nm.y = gy + PADT;
  frame.appendChild(nm);
  await setText(nm, p.name, TEXTW);
  const mt = tplMeta.clone();
  mt.name = "PaketMeta " + p.name; mt.x = cx + PADX; mt.y = gy + PADT + nm.height + 1;
  frame.appendChild(mt);
  await setText(mt, p.meta, TEXTW);
  const pr = tplPrice.clone();
  pr.name = "PaketPrice " + p.name; pr.x = cx + PADX; pr.y = gy + PADT + nm.height + 1 + mt.height + 6;
  frame.appendChild(pr);
  await setText(pr, p.price, TEXTW);
  return { nmH: nm.height, mtH: mt.height };
}
const cells = [
  { p: NEW_PKGS[0], x: 200, y: ROW2_Y, h: row2H },
  { p: NEW_PKGS[1], x: 32, y: row3Y, h: row3H },
  { p: NEW_PKGS[2], x: 200, y: row3Y, h: row3H },
  { p: NEW_PKGS[3], x: 32, y: row4Y, h: row4H },
  { p: NEW_PKGS[4], x: 200, y: row4Y, h: row4H },
];
for (const c of cells) {
  makeCell(c.p, c.x, c.y, c.h);
  const m = await makeTexts(c.p, c.x, c.y);
  placed.push({ name: c.p.name, x: c.x, y: c.y, h: c.h, nameH: Math.round(m.nmH * 10) / 10, metaH: Math.round(m.mtH * 10) / 10 });
}
frame.resize(390, Math.round(frame.height) + delta);

return { frameId: frame.id, name: frame.name, h: frame.height, card2H: newCard2H, delta, noteY, row2H, row3Y, row3H, row4Y, row4H, gridBottom, cellH, placed };
