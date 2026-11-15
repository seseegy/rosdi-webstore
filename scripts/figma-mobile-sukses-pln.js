// Builder frame Figma "Sukses — Token PLN" mobile (390px), diklon dari
// frame Sukses mobile (4:2 Light / 4:29 Dark) lalu diubah isinya.
// Menutup celah: frame Sukses lama hanya mencatat "Untuk PLN, nomor token
// 20 digit tampil di kartu ini juga." (catatan di bawah kartu) tanpa
// menampilkan tokennya; frame baru ini menampilkan token sesuai kode.
// Isi mengikuti src/pages/InfoPages.jsx (SuccessPage) + src/lib.js
// (genToken: 20 digit, dikelompokkan per 4) + src/index.css (.token-box:
// field, border dashed biru 1.5px, radius 12, 19px/800/0.14em — di mobile
// 318px dipakai 15px agar 24 karakter muat satu baris) + src/data.js
// (Token PLN 100.000 = Rp102.500, QRIS tanpa biaya).
// Contoh order: Token PLN — Token 100.000, tujuan 543210987654, QRIS,
// total Rp102.500, token demo "1234 5678 9012 3456 7890".
// Geometri: blok token disisipkan di antara status (berakhir y=252) dan
// baris rincian (mulai y=286); baris rincian + pembatas + total + tombol
// digeser ke bawah sebesar shift yang dihitung dari tinggi catatan token
// (diukur dulu), kartu diperpanjang sebesar shift yang sama. Catatan lama
// di bawah kartu dihapus (isinya kini terwujud sebagai blok token).
// Dijalankan lewat use_figma; placeholder __NAME__/__SRC__/__X__/__Y__/
// __TOKENS__ diisi driver sebelum dikirim.
const T = __TOKENS__;
const FRAME_NAME = "__NAME__";
const SRC_ID = "__SRC__";
const FX = __X__;
const FY = __Y__;

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

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

// ---- validasi struktur sumber ----
const card = frame.children.find((n) => n.type === "RECTANGLE" && n.x === 16 && n.y === 84 && n.width === 358 && n.height === 560);
const status = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Status: Diproses") === 0);
const prodVal = frame.children.find((n) => n.type === "TEXT" && n.characters === "Mobile Legends — 172 Diamonds");
const tujuanVal = frame.children.find((n) => n.type === "TEXT" && n.characters === "12345678 (1234)");
const hargaVal = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp43.500 + Rp0");
const totalVal = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp43.500");
const oldNote = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Untuk PLN, nomor token") === 0);
if (!card || !status || !prodVal || !tujuanVal || !hargaVal || !totalVal || !oldNote) {
  throw new Error("struktur frame sumber tidak seperti diduga: card=" + !!card + " status=" + !!status + " prod=" + !!prodVal + " tujuan=" + !!tujuanVal + " harga=" + !!hargaVal + " total=" + !!totalVal + " note=" + !!oldNote);
}

// ---- ukur tinggi catatan token dulu, lalu hitung shift ----
const NOTE_STR = "Masukkan 20 digit ini ke meteran. Token juga dicatat di riwayat perangkat ini.";
const noteH = await measureH(NOTE_STR, 12.5, "Regular", 318);
const LABEL_Y = 262, BOX_Y = 282, BOX_H = 52, NOTE_Y = 342;
const rowsStart = NOTE_Y + Math.ceil(noteH) + 12;
const shift = rowsStart - 286;

// ---- hapus catatan lama, geser baris rincian + tombol, perpanjang kartu ----
oldNote.remove();
for (const n of frame.children) if (n.y >= 286) n.y += shift;
card.resize(358, 560 + shift);
const cardBottom = 84 + 560 + shift;
const frameH = Math.max(760, cardBottom + 18);
frame.resize(390, frameH);

// ---- ubah teks rincian ke order PLN ----
await setText(status, "Status: Selesai. Token PLN kamu sudah terbit.", 296);
await setText(prodVal, "Token PLN — Token 100.000", 174);
await setText(tujuanVal, "543210987654", 174);
await setText(hargaVal, "Rp102.500 + Rp0", 174);
await setText(totalVal, "Rp102.500", 100);

// ---- blok token (label + kotak dashed + catatan) ----
const _label = await newText(frame, "TokenLabel", 36, LABEL_Y, "Nomor token PLN kamu", 12, "SemiBold", T.sub, 318);
const box = figma.createRectangle();
box.name = "TokenBox"; box.x = 36; box.y = BOX_Y;
box.resize(318, BOX_H);
box.fills = solid(T.field);
box.strokes = solid(T.blue);
box.strokeWeight = 1.5;
try { box.dashPattern = [5, 4]; } catch { /* dash tidak didukung di env ini */ }
box.cornerRadius = 12;
frame.appendChild(box);
const token = await newText(frame, "TokenValue", 50, BOX_Y + 16, "1234 5678 9012 3456 7890", 15, "ExtraBold", T.blue, 290);
token.textAlignHorizontal = "CENTER";
token.letterSpacing = { unit: "PIXELS", value: 2.1 };
const _note = await newText(frame, "TokenNote", 36, NOTE_Y, NOTE_STR, 12.5, "Regular", T.sub, 318);

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, noteH, shift, rowsStart, cardBottom, frameH, tokenH: token.height, dashApplied: box.dashPattern ? box.dashPattern.join(",") : "n/a" };
