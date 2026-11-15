// Siklus 129 — perbaikan: selesaikan operasi desktop Light yang terhenti di
// tengah (pitchY salah = 0 karena dihitung dari XL yang masih baris 1).
// Untuk tiap kartu operator: pindahkan ke posisi slot yang benar (absolut,
// dihitung dari kartu Telkomsel + pitch). Footer digeser +pitchY bila masih
// di posisi lama; frame ditumbuhkan bila masih tinggi lama. Aman diulang:
// bila kartu sudah di posisi benar, dx/dy = 0.
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
const COLS = 3;
const byName = (prefix, op) => frame.children.filter((n) => n.name === prefix + " " + op.name || n.name === prefix + " " + op.ini);
const cardRect = (op) => frame.children.find((n) => n.name === "Card " + op.name);

const ts = cardRect(ORDER[0]);
const is = cardRect(ORDER[2]);
const ax = cardRect(ORDER[4]); // Axis: slot lama 3 = baris 2 pertama
if (!ts || !is || !ax) throw new Error("kartu acuan tidak ditemukan");
const pitchX = is.x - ts.x;
const pitchY = ax.y - ts.y;
if (pitchY <= 0) throw new Error("pitchY tidak valid: " + pitchY);
const slotPos = (s) => ({ x: ts.x + (s % COLS) * pitchX, y: ts.y + Math.floor(s / COLS) * pitchY });

const moved = [];
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
  moved.push({ op: op.name, dx, dy });
}

// Footer: geser hanya bila masih di posisi lama (FooterBg.y < gridBottom baru).
const rows = Math.ceil(ORDER.length / COLS);
const newGridBottom = ts.y + (rows - 1) * pitchY + ts.height;
const footerBg = frame.children.find((n) => n.name === "FooterBg");
let footerMoved = 0;
if (footerBg && footerBg.y < newGridBottom) {
  const foot = frame.children.filter((n) => /^(Footer|Foot|Copyright|PayChip)/.test(n.name));
  for (const n of foot) n.y += pitchY;
  footerMoved = foot.length;
}
const oldH = frame.height;
const newH = newGridBottom + 40 + 210;
if (oldH < newH) frame.resize(1280, newH);

return {
  frameId: frame.id, name: frame.name, w: frame.width, h: frame.height,
  pitchX, pitchY, moved, footerMoved, oldH, newH, newGridBottom,
};
