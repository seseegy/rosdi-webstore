// Siklus 133: sinkron grid "Top Up Game" 6 -> 11 kartu di latar 6 frame modal mobile
// (S&K, Refund, Masuk — Light+Dark). Pola Siklus 126 (buildMobile) + pola Siklus 68/9:
// hanya simpul LATAR (sebelum Veil) yang digeser +delta; veil diresize ke tinggi frame
// baru; kartu modal + isinya (sesudah Veil) geser delta/2 agar tetap terpusat vertikal.
// Kartu baru disisipkan SEBELUM Veil (insertChild), bukan append — supaya tetap di
// balik veil. Guard: frame yang sudah punya kartu Valorant dilewati (idempotent).
const GAMES = [
  { name: "Valorant", initials: "VL", color: "#475569", sub: "Riot Games \u00b7 Via Riot ID + tag", from: "Mulai Rp59.000" },
  { name: "Call of Duty: Mobile", initials: "CM", color: "#2563eb", sub: "Garena \u00b7 Top up langsung ke akun", from: "Mulai Rp15.000" },
  { name: "League of Legends: Wild Rift", initials: "WR", color: "#0284c7", sub: "Riot Games \u00b7 Via Riot ID + tag", from: "Mulai Rp79.000" },
  { name: "Arena of Valor", initials: "AV", color: "#0f766e", sub: "Garena \u00b7 Top up langsung ke akun", from: "Mulai Rp15.000" },
  { name: "Delta Force", initials: "DF", color: "#1e3a8a", sub: "Garena \u00b7 Top up langsung ke akun", from: "Mulai Rp15.000" },
];

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
async function setText(node, chars) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = chars;
}
function findByName(frame, name, type) {
  return frame.children.find((n) => n.name === name && (!type || n.type === type));
}
// Template kartu game ML dicari dari posisi relatif terhadap bg-nya (sama seperti
// Siklus 126 — nama saja tidak unik: teks "ML"/"Mobile Legends" juga ada di kartu Flash Sale).
function findMobileTemplate(frame) {
  const bg = findByName(frame, "Mobile Legends", "RECTANGLE");
  if (!bg) return { error: "bg Mobile Legends hilang" };
  const inside = (n) => n.x >= bg.x && n.x < bg.x + bg.width && n.y >= bg.y && n.y < bg.y + bg.height;
  const tile = frame.children.find((n) => n.type === "RECTANGLE" && (n.name || "").indexOf("Tile ") === 0 && inside(n));
  const tileText = frame.children.find((n) => n.type === "TEXT" && tile && n.x >= tile.x && n.x < tile.x + tile.width && n.y >= tile.y && n.y < tile.y + tile.height);
  const nameT = frame.children.find((n) => n.type === "TEXT" && Math.abs(n.y - (bg.y + 70)) <= 2 && Math.abs(n.x - (bg.x + 14)) <= 2);
  const subT = frame.children.find((n) => n.type === "TEXT" && Math.abs(n.y - (bg.y + 90)) <= 2 && Math.abs(n.x - (bg.x + 14)) <= 2);
  const fromT = frame.children.find((n) => n.type === "TEXT" && (n.name || "").indexOf("Mulai Rp") === 0 && inside(n));
  return { bg, tile, tileText, nameT, subT, fromT };
}

async function makeMobileCard(frame, t, g, cx, cy, insertAt, created) {
  const bg = t.bg.clone(); frame.insertChild(insertAt, bg);
  const tile = t.tile.clone(); frame.insertChild(insertAt + 1, tile);
  const tileText = t.tileText.clone(); frame.insertChild(insertAt + 2, tileText);
  const nameT = t.nameT.clone(); frame.insertChild(insertAt + 3, nameT);
  const subT = t.subT.clone(); frame.insertChild(insertAt + 4, subT);
  const fromT = t.fromT.clone(); frame.insertChild(insertAt + 5, fromT);
  bg.name = g.name; bg.x = cx; bg.y = cy;
  tile.name = "Tile " + g.initials; tile.x = cx + 14; tile.y = cy + 14;
  tile.fills = [{ type: "SOLID", color: hex(g.color) }];
  await setText(tileText, g.initials); tileText.name = g.initials;
  tileText.x = tile.x + (46 - tileText.width) / 2; tileText.y = tile.y + 14;
  await setText(nameT, g.name); nameT.name = g.name;
  nameT.x = cx + 14; nameT.y = cy + 70;
  const nameH = Math.round(nameT.height);
  await setText(subT, g.sub); subT.name = g.sub;
  subT.x = cx + 14; subT.y = nameT.y + nameH + 2;
  const subH = Math.round(subT.height);
  await setText(fromT, g.from); fromT.name = g.from;
  fromT.x = cx + 14; fromT.y = subT.y + subH + 6;
  const cardH = Math.round(fromT.y + 16 + 14 - cy);
  bg.resize(173, cardH);
  created.push(bg.id, tile.id, tileText.id, nameT.id, subT.id, fromT.id);
  return { cardH, nameH, subH };
}

async function buildClone(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  if (!frame) return { frameId, error: "frame tidak ditemukan" };
  if (findByName(frame, "Valorant", "RECTANGLE")) {
    return { frameId, name: frame.name, skipped: "sudah 11 kartu" };
  }
  const veilIdx = frame.children.findIndex((n) => n.name === "Veil");
  if (veilIdx < 0) return { frameId, error: "Veil hilang" };
  const veil = frame.children[veilIdx];
  const bgNodes = frame.children.slice(0, veilIdx);
  const overlayNodes = frame.children.slice(veilIdx + 1);
  const modalCard = overlayNodes.find((n) => n.name === "Modal");
  const modalYBefore = modalCard ? Math.round(modalCard.y) : null;
  const t = findMobileTemplate(frame);
  if (t.error) return { frameId, error: t.error };
  for (const k of ["bg", "tile", "tileText", "nameT", "subT", "fromT"]) if (!t[k]) return { frameId, error: "template hilang: " + k };
  const created = [];
  const rows = [[GAMES[0], GAMES[1]], [GAMES[2], GAMES[3]], [GAMES[4]]];
  const colX = [16, 201];
  let y = 1261;
  let insertAt = veilIdx;
  const made = [];
  for (const row of rows) {
    let rowH = 0;
    for (let i = 0; i < row.length; i++) {
      const r = await makeMobileCard(frame, t, row[i], colX[i], y, insertAt, created);
      made.push({ game: row[i].name, y, cardH: r.cardH, nameH: r.nameH, subH: r.subH });
      rowH = Math.max(rowH, r.cardH);
      insertAt += 6;
    }
    y += rowH + 12;
  }
  const gridBottom = y - 12;
  const delta = (gridBottom + 28) - 1277;
  const overlayShift = Math.round(delta / 2);
  let shiftedBg = 0;
  for (const c of bgNodes) {
    if (c.y >= 1277) { c.y += delta; shiftedBg++; }
  }
  veil.resize(390, Math.round(frame.height) + delta);
  for (const c of overlayNodes) c.y += overlayShift;
  frame.resize(390, Math.round(frame.height) + delta);
  const modalYAfter = modalCard ? Math.round(modalCard.y) : null;
  return { frameId, name: frame.name, made, gridBottom, delta, overlayShift,
    shiftedBg, overlayMoved: overlayNodes.length, modalYBefore, modalYAfter,
    veilH: Math.round(veil.height), frameH: Math.round(frame.height), created: created.length };
}

const results = [];
for (const id of __FRAME_IDS__) results.push(await buildClone(id));
return results;
