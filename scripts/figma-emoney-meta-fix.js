// Siklus 53: sinkron meta e-wallet mobile ke data.js —
// "Admin sudah termasuk" -> "Biaya admin sudah termasuk" (EMONEY_ITEMS meta).
// Ukur dulu apakah teks baru membungkus (font 9px, lebar 134): bila ya, sel
// tumbuh +11 dan baris di bawahnya + kartu Langkah 2 + semua simpul di bawah
// kartu ikut geser; bila tidak, hanya teks yang berubah.
const NEW_META = "Biaya admin sudah termasuk";
const LINE = 11; // tinggi 1 baris meta 9px

async function fixFrame(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const metas = frame.findAllWithCriteria({ types: ["TEXT"] })
    .filter(t => t.characters === "Admin sudah termasuk");
  // 1) ganti teks (resep kanonik: load font -> autoResize HEIGHT -> characters)
  const wrapped = [];
  for (const m of metas) {
    const segs = m.getStyledTextSegments(["fontName"]);
    for (const s of segs) await figma.loadFontAsync(s.fontName);
    m.textAutoResize = "HEIGHT";
    m.characters = NEW_META;
    m.name = NEW_META;
    if (m.height > LINE + 1) wrapped.push(m.id);
  }
  const result = { frame: frame.name, count: metas.length, wrapped: wrapped.length, shifted: 0, cardGrew: 0 };
  if (wrapped.length === 0) return result;

  // 2) geometri: snapshot semua anak frame (koordinat relatif frame)
  const kids = frame.children.map(c => ({ n: c, x: c.x, y: c.y, w: c.width, h: c.height }));
  const cellOf = (tx, ty) => {
    const cands = kids.filter(k => k.n.type === "RECTANGLE" && k.x <= tx && tx <= k.x + k.w && k.y <= ty && ty <= k.y + k.h);
    cands.sort((a, b) => a.w * a.h - b.w * b.h);
    return cands[0] || null;
  };
  // baris = y unik rect sel yang memuat meta terbungkus
  const wrappedCells = [];
  for (const m of metas) {
    if (!wrapped.includes(m.id)) continue;
    const cell = cellOf(m.x + m.width / 2, m.y + m.height / 2);
    if (cell) wrappedCells.push(cell);
  }
  const rowYs = [...new Set(wrappedCells.map(c => c.y))].sort((a, b) => a - b);
  const shiftForRow = (rowY) => rowYs.filter(y => y < rowY).length * LINE;
  // sel: tumbuh bila barisnya terbungkus, geser bila ada baris terbungkus di atasnya
  const allCells = kids.filter(k => k.n.type === "RECTANGLE" && k.w === 158 && k.h === 66);
  for (const cell of allCells) {
    const shift = shiftForRow(cell.y);
    if (shift) cell.n.y = cell.y + shift;
    if (rowYs.includes(cell.y)) cell.n.height = cell.h + LINE;
  }
  // teks di dalam sel (nama/harga/meta): ikut geser barisnya
  for (const k of kids) {
    if (k.n.type !== "TEXT") continue;
    const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
    const cell = cellOf(cx, cy);
    if (!cell) continue;
    const shift = shiftForRow(cell.y);
    if (shift) k.n.y = k.y + shift;
  }
  const totalDelta = rowYs.length * LINE;
  // kartu Langkah 2 = RECTANGLE w=358 yang memuat sel-sel
  const card = kids.find(k => k.n.type === "RECTANGLE" && k.w === 358 && k.y < 274 && k.y + k.h > 600);
  const cardBottom = card.y + card.h;
  if (card) card.n.height = card.h + totalDelta;
  // semua simpul di bawah kartu ikut geser
  for (const k of kids) {
    if (k.y >= cardBottom && k.n !== card.n) k.n.y = k.y + totalDelta;
  }
  frame.resize(frame.width, frame.height + totalDelta);
  result.shifted = totalDelta;
  result.cardGrew = totalDelta;
  result.rowsWrapped = rowYs.length;
  return result;
}
return { light: await fixFrame("3:2"), dark: await fixFrame("3:60") };
