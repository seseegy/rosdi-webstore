// Siklus 129: tambah kartu by.U ke frame indeks Pulsa/Data (mobile+desktop).
// by.U adalah operator ke-2 di OPERATORS (src/data.js) — disisipkan di slot 1,
// 5 kartu lama geser satu slot; baris baru di bawah, frame tumbuh, footer
// desktop ikut geser. Dijalankan lewat use_figma; placeholder __FRAME__ /
// __TOKENS__ / __MODE__ / __LAYOUT__ diisi driver sebelum dikirim.
// Guard: lempar error bila "Card by.U" sudah ada (idempotent).
const T = __TOKENS__;
const MODE = "__MODE__";       // "pulsa" | "data"
const LAYOUT = "__LAYOUT__";   // "mobile" | "desktop"

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

function rect(parent, name, x, y, w, h, fill, radius, stroke, strokeW) {
  const n = figma.createRectangle();
  n.name = name; n.x = x; n.y = y; n.resize(w, h);
  n.fills = fill ? solid(fill) : [];
  if (radius) n.cornerRadius = radius;
  if (stroke) { n.strokes = solid(stroke); n.strokeWeight = strokeW || 1; }
  parent.appendChild(n); return n;
}
async function txt(parent, name, x, y, str, size, weight, color, opts) {
  opts = opts || {};
  const n = figma.createText();
  n.name = name; n.x = x; n.y = y;
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.fills = solid(color); n.characters = str;
  if (opts.lineHeight) n.lineHeight = { unit: "PIXELS", value: opts.lineHeight };
  if (opts.width) { n.textAutoResize = "HEIGHT"; n.resize(opts.width, n.height); }
  parent.appendChild(n); return n;
}
async function centerTxt(parent, name, cx, cy, str, size, weight, color) {
  const n = await txt(parent, name, 0, 0, str, size, weight, color);
  n.x = cx - n.width / 2; n.y = cy - n.height / 2;
  return n;
}

const BYU = MODE === "pulsa"
  ? { name: "by.U", ini: "BU", color: "#1E3A8A", sub: "Pulsa reguler semua nominal", from: "Dari Rp6.400" }
  : { name: "by.U", ini: "BU", color: "#1E3A8A", sub: "10 paket tersedia", from: "Dari Rp9.000" };

// Urutan tampil = urutan OPERATORS di data.js (by.U ke-2, setelah Telkomsel).
const ORDER = [
  { name: "Telkomsel", ini: "TS" },
  { name: "by.U", ini: "BU" },
  { name: "Indosat", ini: "IS" },
  { name: "XL", ini: "XL" },
  { name: "Axis", ini: "AX" },
  { name: "Tri", ini: "3" },
  { name: "Smartfren", ini: "SF" },
];

const frame = await figma.getNodeByIdAsync("__FRAME__");
if (!frame) throw new Error("frame tidak ditemukan");
if (frame.children.some((n) => n.name === "Card by.U")) {
  throw new Error("guard: Card by.U sudah ada di " + frame.name + " — batal, tanpa perubahan");
}

const byName = (prefix, op) => frame.children.filter((n) => n.name === prefix + " " + op.name || n.name === prefix + " " + op.ini);
const cardRect = (op) => frame.children.find((n) => n.name === "Card " + op.name);
const ts = cardRect(ORDER[0]);
const is = cardRect(ORDER[2]); // Indosat: slot lama 1 (kolom 2 baris 1)
if (!ts || !is) throw new Error("kartu acuan tidak ditemukan");
const COLS = LAYOUT === "mobile" ? 2 : 3;
// pitchY HARUS dari kartu baris 2 (slot lama COLS), bukan dari XL: di desktop
// 3 kolom, XL (slot lama 2) masih baris 1 sehingga xl.y - ts.y = 0.
const rowRef = cardRect(ORDER[COLS + 1]); // slot lama COLS: XL (mobile) / Axis (desktop)
const pitchX = is.x - ts.x;
const pitchY = rowRef.y - ts.y;
if (!rowRef || pitchY <= 0) throw new Error("pitchY tidak valid: " + pitchY);
const cardW = ts.width, cardH = ts.height;
const slotPos = (s) => ({ x: ts.x + (s % COLS) * pitchX, y: ts.y + Math.floor(s / COLS) * pitchY });

// ---- geser 5 kartu lama satu slot (slot lama s -> s+1) ----
const moved = [];
for (let s = 1; s <= 5; s++) {
  const op = ORDER[s + 1]; // ORDER[2..6] = Indosat..Smartfren (slot lama 1..5)
  const from = slotPos(s), to = slotPos(s + 1);
  const dx = to.x - from.x, dy = to.y - from.y;
  const nodes = []
    .concat(byName("Card", op), byName("Tile", op), byName("TileText", op),
            byName("Name", op), byName("Sub", op), byName("From", op));
  if (nodes.length !== 6) throw new Error("kartu " + op.name + ": simpul " + nodes.length + " != 6");
  for (const n of nodes) { n.x += dx; n.y += dy; }
  moved.push({ op: op.name, dx, dy, nodes: nodes.length });
}

// ---- kartu baru by.U di slot 1 ----
const p = slotPos(1);
const created = [];
if (LAYOUT === "mobile") {
  const PAD = 14, TEXTW = cardW - PAD * 2;
  created.push(rect(frame, "Card by.U", p.x, p.y, cardW, cardH, T.surface, 14, T.line));
  created.push(rect(frame, "Tile BU", p.x + PAD, p.y + PAD, 46, 46, BYU.color, 12));
  created.push(await centerTxt(frame, "TileText BU", p.x + PAD + 23, p.y + PAD + 23, "BU", 15, "Extra Bold", "#FFFFFF"));
  const nm = await txt(frame, "Name by.U", p.x + PAD, p.y + PAD + 46 + 10, BYU.name, 14.5, "Semi Bold", T.ink, { width: TEXTW });
  const sb = await txt(frame, "Sub by.U", p.x + PAD, p.y + PAD + 46 + 10 + nm.height + 2, BYU.sub, 12.5, "Regular", T.sub, { width: TEXTW, lineHeight: 16 });
  created.push(nm, sb);
  created.push(await txt(frame, "From by.U", p.x + PAD, p.y + PAD + 46 + 10 + nm.height + 2 + sb.height + 6, BYU.from, 13, "Semi Bold", T.blue, { width: TEXTW }));
} else {
  created.push(rect(frame, "Card by.U", p.x, p.y, cardW, cardH, T.surface, 14, T.line));
  created.push(rect(frame, "Tile BU", p.x + 14, p.y + 14, 46, 46, BYU.color, 12));
  created.push(await centerTxt(frame, "TileText BU", p.x + 14 + 23, p.y + 14 + 23, "BU", 15, "Extra Bold", "#FFFFFF"));
  created.push(await txt(frame, "Name by.U", p.x + 14, p.y + 72, BYU.name, 14.5, "Semi Bold", T.ink));
  created.push(await txt(frame, "Sub by.U", p.x + 14, p.y + 93, BYU.sub, 12.5, "Regular", T.sub));
  created.push(await txt(frame, "From by.U", p.x + 14, p.y + 112, BYU.from, 13, "Semi Bold", T.blue));
}

// ---- tumbuhkan frame; footer desktop geser ----
const rows = Math.ceil(ORDER.length / COLS);
const newGridBottom = ts.y + (rows - 1) * pitchY + cardH;
let footerMoved = 0;
if (LAYOUT === "mobile") {
  frame.resize(390, newGridBottom + 16);
} else {
  const foot = frame.children.filter((n) => /^(Footer|Foot|Copyright|PayChip)/.test(n.name));
  for (const n of foot) n.y += pitchY;
  footerMoved = foot.length;
  frame.resize(1280, frame.height + pitchY);
}

return {
  frameId: frame.id, name: frame.name, w: frame.width, h: frame.height,
  mode: MODE, layout: LAYOUT, cols: COLS, pitchX, pitchY, cardW, cardH,
  moved, createdIds: created.map((n) => n.id), newGridBottom, footerMoved,
};
