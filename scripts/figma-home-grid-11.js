// Siklus 126: grid "Top Up Game" Beranda 6 -> 11 kartu (5 game baru Tahap 5).
// Mobile (390px, 2 kolom): baris 4-6 baru di bawah baris 3; semua simpul y>=1277
// geser ke bawah; tinggi frame tumbuh. Desktop (1280px, 4 kolom): baris 2
// dilengkapi (Valorant, CoD) + baris 3 baru (WR, AoV, DF); simpul y>=991 geser.
// Tinggi kartu diukur dari teks (nama 1/2 baris), bukan asumsi.
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
// Lebar alami teks 1 baris (ukur dulu dengan WIDTH_AND_HEIGHT, lalu kunci HEIGHT).
async function setTextOneLine(node, chars, maxW) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
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
// Template kartu game ML dicari dari posisi relatif terhadap bg-nya (nama saja
// tidak unik: teks "ML"/"Mobile Legends" juga ada di kartu Flash Sale).
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

async function makeMobileCard(frame, t, g, cx, cy, created) {
  const bg = t.bg.clone(); frame.appendChild(bg);
  const tile = t.tile.clone(); frame.appendChild(tile);
  const tileText = t.tileText.clone(); frame.appendChild(tileText);
  const nameT = t.nameT.clone(); frame.appendChild(nameT);
  const subT = t.subT.clone(); frame.appendChild(subT);
  const fromT = t.fromT.clone(); frame.appendChild(fromT);
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

async function buildMobile(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  if (!frame) return { frameId, error: "frame tidak ditemukan" };
  const t = findMobileTemplate(frame);
  if (t.error) return { frameId, error: t.error };
  for (const k of ["bg", "tile", "tileText", "nameT", "subT", "fromT"]) if (!t[k]) return { frameId, error: "template hilang: " + k };
  const created = [];
  const rows = [[GAMES[0], GAMES[1]], [GAMES[2], GAMES[3]], [GAMES[4]]];
  const colX = [16, 201];
  let y = 1261;
  const made = [];
  for (const row of rows) {
    let rowH = 0;
    for (let i = 0; i < row.length; i++) {
      const r = await makeMobileCard(frame, t, row[i], colX[i], y, created);
      made.push({ game: row[i].name, y, cardH: r.cardH, nameH: r.nameH, subH: r.subH });
      rowH = Math.max(rowH, r.cardH);
    }
    y += rowH + 12;
  }
  const gridBottom = y - 12;
  const delta = (gridBottom + 28) - 1277;
  for (const c of frame.children) {
    if (created.indexOf(c.id) >= 0) continue;
    if (c.y >= 1277) c.y += delta;
  }
  frame.resize(390, Math.round(frame.height) + delta);
  return { frameId, name: frame.name, made, gridBottom, delta, frameH: Math.round(frame.height), created: created.length };
}

async function makeDesktopCard(frame, t, g, cx, cy, cardH, created) {
  const bg = t.bg.clone(); frame.appendChild(bg);
  const tile = t.tile.clone(); frame.appendChild(tile);
  const tileText = t.tileText.clone(); frame.appendChild(tileText);
  const nameT = t.nameT.clone(); frame.appendChild(nameT);
  const subT = t.subT.clone(); frame.appendChild(subT);
  const fromT = t.fromT.clone(); frame.appendChild(fromT);
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
  created.push(bg.id, tile.id, tileText.id, nameT.id, subT.id, fromT.id);
  return { subH, fromY: Math.round(fromT.y) };
}

async function buildDesktop(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  if (!frame) return { frameId, error: "frame tidak ditemukan" };
  const t = findDesktopTemplate(frame);
  if (t.error) return { frameId, error: t.error };
  for (const k of ["bg", "tile", "tileText", "nameT", "subT", "fromT"]) if (!t[k]) return { frameId, error: "template hilang: " + k };
  const created = [];
  const colX = [80, 363, 646, 929];
  const made = [];
  // Baris 2 (y=810, tinggi baris 155 seperti HoK/Roblox): Valorant + CoD.
  made.push(await makeDesktopCard(frame, t, GAMES[0], colX[2], 810, 155, created));
  made.push(await makeDesktopCard(frame, t, GAMES[1], colX[3], 810, 155, created));
  // Baris 3 (y=977, tinggi 140): WR + AoV + DF.
  made.push(await makeDesktopCard(frame, t, GAMES[2], colX[0], 977, 140, created));
  made.push(await makeDesktopCard(frame, t, GAMES[3], colX[1], 977, 140, created));
  made.push(await makeDesktopCard(frame, t, GAMES[4], colX[2], 977, 140, created));
  const gridBottom = 977 + 140;
  const delta = (gridBottom + 26) - 991;
  for (const c of frame.children) {
    if (created.indexOf(c.id) >= 0) continue;
    if (c.y >= 991) c.y += delta;
  }
  frame.resize(1280, Math.round(frame.height) + delta);
  return { frameId, name: frame.name, made, gridBottom, delta, frameH: Math.round(frame.height), created: created.length };
}

const mobile = await buildMobile("__MOBILE_ID__");
const desktop = await buildDesktop("__DESKTOP_ID__");
return { mobile, desktop };
