// Fix Siklus 128 (Tahap 5): propagasi DATA_PACKAGES 10 paket ke frame
// "Paket Data Telkomsel — Desktop" — 5 paket lama + 5 paket baru data.js.
// Dijalankan lewat use_figma; placeholder __FRAME__ diisi driver.
// Sel desktop 228x86 (pola figma-desktop-data.js Siklus 22): nama y+12,
// meta y+32, harga y+58. Meta panjang (>204px) dibungkus 2 baris dan harga
// digeser ke bawah meta + 4px — meta tetap persis data.js (bukan dipendekkan).
// Kartu Langkah 2 tumbuh 254 -> 446 (+192); semua simpul y>=620 geser +192;
// aside Ringkasan tidak ikut (berakhir y=644, independen kolom kiri).
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

const frame = figma.getNodeById(FRAME_ID);
if (!frame) throw new Error("frame tidak ditemukan: " + FRAME_ID);
const kids = () => frame.children;

const card2 = kids().find((n) => n.name === "Step2Card");
const card3 = kids().find((n) => n.name === "Step3Card");
if (!card2 || !card3) throw new Error("kartu Langkah 2/3 tidak ditemukan");
const card2Y = Math.round(card2.y), card2H = Math.round(card2.height);
const card3Y = Math.round(card3.y);
if (card2Y !== 350 || card2H !== 254 || card3Y !== 620) throw new Error("geometri tidak seperti diduga: card2 " + card2Y + "/" + card2H + " card3 " + card3Y);

// sel templat tak-terpilih: "Nom Internet Sakti 30GB" (baris 1 tengah)
const tplRect = kids().find((n) => n.name === "Nom Internet Sakti 30GB");
const tplName = kids().find((n) => n.name === "NomName Internet Sakti 30GB");
const tplMeta = kids().find((n) => n.name === "NomMeta Internet Sakti 30GB");
const tplPrice = kids().find((n) => n.name === "NomPrice Internet Sakti 30GB");
if (!tplRect || !tplName || !tplMeta || !tplPrice) throw new Error("sel templat tidak ditemukan");

const DELTA = 192; // kartu 254 -> 446 (baris 3 + 4 grid: 2 x (86 + 10))
const CW = 228, CH = 86, CG = 10, GRID_TOP = 406;
const ROW2_Y = 502;              // baris ke-2 lama (2 sel)
const ROW3_Y = GRID_TOP + 2 * (CH + CG); // 598
const ROW4_Y = ROW3_Y + CH + CG;         // 694
const META_W = CW - 24;          // 204

// ---- geser simpul lama dulu, baru buat sel ----
for (const n of kids()) if (Math.round(n.y) >= card3Y) n.y += DELTA;
card2.resize(716, card2H + DELTA);

// ---- buat 5 sel baru ----
const cells = [
  { p: NEW_PKGS[0], x: 572, y: ROW2_Y },
  { p: NEW_PKGS[1], x: 96, y: ROW3_Y },
  { p: NEW_PKGS[2], x: 334, y: ROW3_Y },
  { p: NEW_PKGS[3], x: 572, y: ROW3_Y },
  { p: NEW_PKGS[4], x: 96, y: ROW4_Y },
];
const placed = [];
for (const c of cells) {
  const r = tplRect.clone();
  r.name = "Nom " + c.p.name; r.x = c.x; r.y = c.y; r.resize(CW, CH);
  frame.appendChild(r);
  const nm = tplName.clone();
  nm.name = "NomName " + c.p.name; nm.x = c.x + 12; nm.y = c.y + 12;
  frame.appendChild(nm);
  await setText(nm, c.p.name);
  const mt = tplMeta.clone();
  mt.name = "NomMeta " + c.p.name; mt.x = c.x + 12; mt.y = c.y + 32;
  frame.appendChild(mt);
  await setText(mt, c.p.meta);
  // meta panjang: bungkus ke lebar sel; harga turun ke bawah meta + 4
  let priceY = c.y + 58;
  let wrapped = false;
  if (Math.round(mt.width) > META_W) {
    mt.textAutoResize = "HEIGHT"; mt.resize(META_W, mt.height);
    priceY = Math.round(mt.y + mt.height) + 4;
    wrapped = true;
  }
  const pr = tplPrice.clone();
  pr.name = "NomPrice " + c.p.name; pr.x = c.x + 12; pr.y = priceY;
  frame.appendChild(pr);
  await setText(pr, c.p.price);
  placed.push({ name: c.p.name, x: c.x, y: c.y, metaW: Math.round(mt.width), metaH: Math.round(mt.height * 10) / 10, priceY: Math.round(priceY), wrapped });
}
frame.resize(1280, Math.round(frame.height) + DELTA);

return { frameId: frame.id, name: frame.name, h: frame.height, card2H: card2H + DELTA, delta: DELTA, placed };
