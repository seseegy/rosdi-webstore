// Read-only: ukur catatan stok Langkah 3 "Stok: tersedia" di frame mobile Genshin (Siklus 60).
async function probe(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const fb = frame.absoluteBoundingBox;
  const rel = n => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const note = frame.findAllWithCriteria({ types: ["TEXT"] }).find(t => t.characters === "Stok: tersedia");
  if (!note) return { frame: frame.name, note: null };
  const segs = note.getStyledTextSegments(["fontName", "fontSize", "lineHeight"]);
  // kartu Langkah 3 = leluhur terdekat yang lebarnya ~358 (kartu langkah) dan memuat note
  let card = note.parent;
  while (card && !(card.width >= 340 && card.width <= 380 && card.height >= 40 && card.height <= 200)) card = card.parent;
  // simpul pertama di bawah kartu (top y > kartu bawah)
  const below = frame.findAll(n => n.id !== frame.id && n.absoluteBoundingBox && n.absoluteBoundingBox.y >= (card ? card.absoluteBoundingBox.y + card.height : note.absoluteBoundingBox.y + note.height) - 0.5)
    .map(n => ({ id: n.id, name: n.name, y: +(n.absoluteBoundingBox.y - fb.y).toFixed(1) }))
    .sort((a, b) => a.y - b.y).slice(0, 3);
  return {
    frame: frame.name, frameH: frame.height,
    note: { id: note.id, ...rel(note), fontSize: segs[0] ? segs[0].fontSize : null, lineHeight: segs[0] ? segs[0].lineHeight : null, textAutoResize: note.textAutoResize },
    card: card ? { id: card.id, name: card.name, ...rel(card) } : null,
    below,
  };
}
return { giL: await probe("6:2"), giD: await probe("6:108") };
