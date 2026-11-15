// Siklus 134: sinkron grid "Top Up Game" 6 -> 11 kartu di latar keenam frame
// modal DESKTOP (klon Beranda Desktop pra-126) + judul seksi util + teks S&K.
// Pola desktop Siklus 126 (figma-home-grid-11.js) + pola mobile Siklus 133
// (figma-clones-grid11.js): kartu baru disisipkan SEBELUM Veil; simpul latar
// y>=991 geser +152; frame 2255->2407; veil ikut 2407; kartu modal dipusatkan
// ulang persis di frame baru (bukan +76 buta — hitung dari cardH).
// Tambahan: HeadUtil "Pulsa, Data, PLN & E-Wallet" -> "Pulsa, Data, PLN,
// E-Wallet & Tagihan" (Home.jsx:120); body S&K -> DOCS.sk Footer.jsx
// (tambah ", dan nomor tagihan") + kartu S&K dihitung ulang dari bodyH.
const GAMES = [
  { name: "Valorant", initials: "VL", color: "#475569", sub: "Riot Games \u00b7 Via Riot ID + tag", from: "Mulai Rp59.000" },
  { name: "Call of Duty: Mobile", initials: "CM", color: "#2563eb", sub: "Garena \u00b7 Top up langsung ke akun", from: "Mulai Rp15.000" },
  { name: "League of Legends: Wild Rift", initials: "WR", color: "#0284c7", sub: "Riot Games \u00b7 Via Riot ID + tag", from: "Mulai Rp79.000" },
  { name: "Arena of Valor", initials: "AV", color: "#0f766e", sub: "Garena \u00b7 Top up langsung ke akun", from: "Mulai Rp15.000" },
  { name: "Delta Force", initials: "DF", color: "#1e3a8a", sub: "Garena \u00b7 Top up langsung ke akun", from: "Mulai Rp15.000" },
];
const HEAD_NEW = "Pulsa, Data, PLN, E-Wallet & Tagihan";
const SK_BODY_NEW = "Semua pesanan diproses otomatis setelah pembayaran terkonfirmasi. Pembeli wajib memeriksa User ID, nomor HP, ID pelanggan, dan nomor tagihan sebelum membayar \u2014 kesalahan penulisan tujuan di luar tanggung jawab Rosdi Store dan pesanan yang sudah terproses tidak dapat dibatalkan. Harga mengikuti katalog pemasok dan dapat berubah sewaktu-waktu; harga yang berlaku adalah harga saat pesanan dibuat.";
const RF_BODY = "Pesanan yang gagal terproses (stok kosong, gangguan pemasok, atau item tidak terkirim) dikembalikan penuh ke metode pembayaran asal, maksimal 1x24 jam sejak status gagal tercatat. Token PLN dan kode voucher yang sudah terbit tidak dapat dibatalkan. Untuk klaim, buka Cek Transaksi dan siapkan nomor transaksimu.";
const DELTA = 152;
const SHIFT_Y = 991;

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
async function loadFonts(node) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
}
async function setText(node, chars) {
  await loadFonts(node);
  node.characters = chars;
}
async function setTextOneLine(node, chars, maxW) {
  await loadFonts(node);
  node.textAutoResize = "WIDTH_AND_HEIGHT";
  node.characters = chars;
  const w = Math.min(Math.ceil(node.width), maxW);
  node.textAutoResize = "HEIGHT";
  node.resize(w, node.height);
  return w;
}
function findByName(frame, name, type) {
  return frame.children.find((n) => n.name === name && (!type || n.type === type));
}
function findDesktopTemplate(frame) {
  const bg = findByName(frame, "Card Mobile Legends", "RECTANGLE");
  if (!bg) return { error: "bg Card Mobile Legends hilang" };
  const inside = (n) => n.x >= bg.x && n.x < bg.x + bg.width && n.y >= bg.y && n.y < bg.y + bg.height;
  const tile = frame.children.find((n) => n.type === "RECTANGLE" && (n.name || "").indexOf("Tile ") === 0 && inside(n));
  const tileText = frame.children.find((n) => n.type === "TEXT" && tile && n.x >= tile.x && n.x < tile.x + tile.width && n.y >= tile.y && n.y < tile.y + tile.height);
  const nameT = findByName(frame, "Name Mobile Legends", "TEXT");
  const subT = frame.children.find((n) => n.type === "TEXT" && (n.name || "").indexOf("Moonton") === 0 && inside(n));
  const fromT = findByName(frame, "From Mobile Legends", "TEXT");
  return { bg, tile, tileText, nameT, subT, fromT };
}

async function makeDesktopCard(frame, t, g, cx, cy, cardH, created) {
  const bg = t.bg.clone();
  const tile = t.tile.clone();
  const tileText = t.tileText.clone();
  const nameT = t.nameT.clone();
  const subT = t.subT.clone();
  const fromT = t.fromT.clone();
  bg.name = "Card " + g.name; bg.x = cx; bg.y = cy; bg.resize(271, cardH);
  tile.name = "Tile " + g.initials; tile.x = cx + 14; tile.y = cy + 14;
  tile.fills = [{ type: "SOLID", color: hex(g.color) }];
  await setText(tileText, g.initials); tileText.name = "TileText " + g.initials;
  tileText.x = tile.x + (46 - tileText.width) / 2; tileText.y = tile.y + 14;
  nameT.name = "Name " + g.name; nameT.x = cx + 14; nameT.y = cy + 72;
  await setTextOneLine(nameT, g.name, 243);
  await setText(subT, g.sub); subT.name = "Sub " + g.name;
  subT.x = cx + 14; subT.y = cy + 93;
  const subH = Math.round(subT.height);
  fromT.name = "From " + g.name; fromT.x = cx + 14; fromT.y = subT.y + subH + 4;
  await setTextOneLine(fromT, g.from, 243);
  created.push(bg, tile, tileText, nameT, subT, fromT);
  return { subH, fromY: Math.round(fromT.y) };
}

async function processModal(frameId, kind) {
  const frame = await figma.getNodeByIdAsync(frameId);
  if (!frame) return { frameId, error: "frame tidak ditemukan" };
  const veil = findByName(frame, "Veil", "RECTANGLE");
  if (!veil) return { frameId, error: "Veil hilang" };
  let veilIdx = frame.children.indexOf(veil);
  const res = { frameId, name: frame.name, frameHBefore: Math.round(frame.height) };
  const gridDone = !!findByName(frame, "Card Valorant", "RECTANGLE");
  res.gridDone = gridDone;
  if (!gridDone) {
    const t = findDesktopTemplate(frame);
    if (t.error) return { frameId, error: t.error };
    for (const k of ["bg", "tile", "tileText", "nameT", "subT", "fromT"]) if (!t[k]) return { frameId, error: "template hilang: " + k };
    const created = [];
    const colX = [80, 363, 646, 929];
    const made = [];
    made.push(await makeDesktopCard(frame, t, GAMES[0], colX[2], 810, 155, created));
    made.push(await makeDesktopCard(frame, t, GAMES[1], colX[3], 810, 155, created));
    made.push(await makeDesktopCard(frame, t, GAMES[2], colX[0], 977, 140, created));
    made.push(await makeDesktopCard(frame, t, GAMES[3], colX[1], 977, 140, created));
    made.push(await makeDesktopCard(frame, t, GAMES[4], colX[2], 977, 140, created));
    res.made = made;
    // Sisipkan kartu baru SEBELUM Veil, urutan tetap (append dulu lalu pindah).
    created.forEach((n) => { frame.appendChild(n); });
    created.forEach((n, i) => { frame.insertChild(veilIdx + i, n); });
    const createdIds = created.map((n) => n.id);
    veilIdx = frame.children.indexOf(veil);
    for (const c of frame.children) {
      if (createdIds.indexOf(c.id) >= 0) continue;
      if (c === veil) continue;
      if (frame.children.indexOf(c) > veilIdx) continue; // simpul modal: nanti
      if (c.y >= SHIFT_Y) c.y += DELTA;
    }
    frame.resize(1280, Math.round(frame.height) + DELTA);
    veil.resize(1280, Math.round(frame.height));
    res.frameHAfter = Math.round(frame.height);
  } else {
    res.frameHAfter = Math.round(frame.height);
  }
  // Judul seksi util (simpul latar, sebelum veil).
  const head = findByName(frame, "HeadUtil", "TEXT");
  if (head) {
    const hBefore = Math.round(head.height);
    if (head.characters !== HEAD_NEW) { await setText(head, HEAD_NEW); }
    res.head = { hBefore, hAfter: Math.round(head.height), wAfter: Math.round(head.width), y: Math.round(head.y) };
  } else { res.head = { error: "HeadUtil hilang" }; }
  // Pusatkan ulang kartu modal di frame baru (hitung dari cardH, idempotent).
  veilIdx = frame.children.indexOf(veil);
  const modalNodes = frame.children.slice(veilIdx + 1);
  const card = modalNodes.find((n) => n.name === "Modal" && n.type === "RECTANGLE");
  if (!card) return { frameId, error: "kartu Modal hilang", res };
  const title = modalNodes.find((n) => n.type === "TEXT" && (kind === "sk" ? n.name === "Syarat & Ketentuan" : kind === "rf" ? n.name === "Kebijakan Pengembalian" : n.name === "Masuk ke Rosdi Store"));
  const bodyPrefix = kind === "sk" ? "Semua pesanan" : kind === "rf" ? "Pesanan yang gagal" : "Sedang disiapkan";
  const body = modalNodes.find((n) => n.type === "TEXT" && (n.name || "").indexOf(bodyPrefix) === 0);
  const btnRectName = kind === "masuk" ? "Tombol Masuk" : "Tombol Tutup";
  const btnRect = modalNodes.find((n) => n.name === btnRectName && n.type === "RECTANGLE");
  const btnTextName = kind === "masuk" ? "Siap, lanjut belanja" : "Tutup";
  const btnText = modalNodes.find((n) => n.type === "TEXT" && n.name === btnTextName);
  if (!title || !body || !btnRect || !btnText) {
    return { frameId, error: "simpul modal tidak lengkap", found: { title: !!title, body: !!body, btnRect: !!btnRect, btnText: !!btnText }, res };
  }
  let cardH = Math.round(card.height);
  if (kind === "sk") {
    const bodyHBefore = Math.round(body.height);
    await setText(body, SK_BODY_NEW);
    body.name = SK_BODY_NEW;
    const bodyH = Math.round(body.height);
    cardH = 20 + 21 + 12 + bodyH + 16 + 44 + 20;
    res.skBody = { bodyHBefore, bodyHAfter: bodyH, cardHBefore: Math.round(card.height), cardHAfter: cardH };
  } else if (kind === "rf") {
    res.rfBodyMatch = body.characters === RF_BODY;
  }
  const cardY = Math.round((Math.round(frame.height) - cardH) / 2);
  const titleDy = Math.round(title.y - card.y);
  const bodyDy = 53;
  const btnDy = kind === "sk" ? 53 + Math.round(body.height) + 16 : Math.round(btnRect.y - card.y);
  card.resize(400, cardH);
  card.x = 440; card.y = cardY;
  title.x = 460; title.y = cardY + titleDy;
  body.x = 460; body.y = cardY + bodyDy;
  btnRect.x = 460; btnRect.y = cardY + btnDy;
  btnText.x = 460; btnText.y = btnRect.y + 13;
  res.modal = { cardY, cardH, btnY: Math.round(btnRect.y), titleY: Math.round(title.y) };
  return res;
}

async function fixHomeHeader(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  if (!frame) return { frameId, error: "frame tidak ditemukan" };
  const head = findByName(frame, "HeadUtil", "TEXT");
  if (!head) return { frameId, error: "HeadUtil hilang" };
  const hBefore = Math.round(head.height);
  const wBefore = Math.round(head.width);
  if (head.characters !== HEAD_NEW) await setText(head, HEAD_NEW);
  return { frameId, name: frame.name, hBefore, hAfter: Math.round(head.height), wBefore, wAfter: Math.round(head.width), y: Math.round(head.y) };
}

const out = [];
out.push(await processModal("165:2", "masuk"));
out.push(await processModal("165:247", "masuk"));
out.push(await processModal("170:2", "sk"));
out.push(await processModal("170:247", "sk"));
out.push(await processModal("170:492", "rf"));
out.push(await processModal("170:737", "rf"));
// Sumber: judul seksi di Beranda Desktop juga masih lama — sinkronkan supaya
// klon berikutnya tidak mewarisi teks kedaluwarsa.
out.push({ homeHeader: await fixHomeHeader("20:2") });
out.push({ homeHeader: await fixHomeHeader("21:2") });
return out;
