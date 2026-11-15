// Siklus 129 — perbaikan ke-2 (desktop Light): tempatkan tiap kartu indeks
// desktop ke posisi slot ABSOLUT dari geometri probe awal (origin kartu
// Telkomsel + pitchX 379 / pitchY 156, 3 kolom). Jangkar hanya Telkomsel
// (tidak pernah bergerak); pitch di-hardcode dari probe, BUKAN diturunkan
// dari kartu yang mungkin sudah bergeser.
// Placeholder __FRAME__ diisi driver.
const frame = await figma.getNodeByIdAsync("__FRAME__");
if (!frame) throw new Error("frame tidak ditemukan");

const ORDER = [
  { name: "Telkomsel", ini: "TS" },
  { name: "by.U", ini: "BU" },
  { name: "Indosat", ini: "IS" },
  { name: "XL", ini: "XL" },
  { name: "Axis", ini: "AX" },
  { name: "Tri", ini: "3" },
  { name: "Smartfren", ini: "SF" },
];
const COLS = 3, PITCHX = 379, PITCHY = 156;
const byName = (prefix, op) => frame.children.filter((n) => n.name === prefix + " " + op.name || n.name === prefix + " " + op.ini);
const cardRect = (op) => frame.children.find((n) => n.name === "Card " + op.name);

const ts = cardRect(ORDER[0]);
if (!ts) throw new Error("kartu Telkomsel tidak ditemukan");
const slotPos = (s) => ({ x: ts.x + (s % COLS) * PITCHX, y: ts.y + Math.floor(s / COLS) * PITCHY });

const placed = [];
for (let s = 0; s < ORDER.length; s++) {
  const op = ORDER[s];
  const card = cardRect(op);
  if (!card) throw new Error("kartu " + op.name + " tidak ditemukan");
  const to = slotPos(s);
  const dx = to.x - card.x, dy = to.y - card.y;
  const nodes = []
    .concat(byName("Card", op), byName("Tile", op), byName("TileText", op),
            byName("Name", op), byName("Sub", op), byName("From", op));
  if (nodes.length !== 6) throw new Error("kartu " + op.name + ": simpul " + nodes.length + " != 6");
  for (const n of nodes) { n.x += dx; n.y += dy; }
  placed.push({ op: op.name, x: to.x, y: to.y, dx, dy });
}

// Footer harus di y = gridBottom + 40 = 650; frame 860. Perbaiki bila belum.
const rows = Math.ceil(ORDER.length / COLS);
const newGridBottom = ts.y + (rows - 1) * PITCHY + ts.height;
const footerBg = frame.children.find((n) => n.name === "FooterBg");
let footerMoved = 0;
if (footerBg && footerBg.y !== newGridBottom + 40) {
  const d = (newGridBottom + 40) - footerBg.y;
  const foot = frame.children.filter((n) => /^(Footer|Foot|Copyright|PayChip)/.test(n.name));
  for (const n of foot) n.y += d;
  footerMoved = foot.length;
}
const newH = newGridBottom + 40 + 210;
if (frame.height !== newH) frame.resize(1280, newH);

return {
  frameId: frame.id, name: frame.name, w: frame.width, h: frame.height,
  placed, footerMoved, footerBgY: footerBg ? footerBg.y : null, newGridBottom,
};
