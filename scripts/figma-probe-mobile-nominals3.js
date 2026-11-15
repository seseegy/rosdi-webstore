// Read-only: struktur ringkas 4 frame mobile Pulsa/E-Wallet Light+Dark (Siklus 52).
async function probe(frameId, re) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const fb = frame.absoluteBoundingBox;
  const rel = n => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const title = frame.children.find(c => c.type === "TEXT" && c.characters === "Pilih Nominal");
  const card2 = frame.children.find(c => c.type === "RECTANGLE" && c.width === 358 && c.y < title.y && c.y + c.height > title.y);
  const names = frame.children.filter(c => c.type === "TEXT" && re.test(c.characters));
  const cells = [];
  for (const nm of names) {
    const r = rel(nm);
    const rect = frame.children.find(c => c.type === "RECTANGLE" && Math.abs(c.x - (r.x - 10)) < 1 && Math.abs(c.y - (r.y - 8)) < 1);
    const price = frame.children.find(c => c.type === "TEXT" && c.characters.startsWith("Rp") && Math.abs(c.x - r.x) < 1 && c.y > r.y && c.y < r.y + 30);
    const stroke = rect && rect.strokes.length ? rect.strokes[0].color : null;
    cells.push({ name: nm.characters, price: price ? price.characters : null, rectId: rect ? rect.id : null, nameId: nm.id, priceId: price ? price.id : null, sel: !!stroke });
  }
  const gridBottom = Math.max(...cells.map(c => { const n = figma.getNodeById(c.nameId); return n.y + 54; }));
  const below = frame.children.filter(c => c.y >= gridBottom - 1 && !cells.some(x => x.rectId === c.id || x.nameId === c.id || x.priceId === c.id)).map(c => ({ id: c.id, name: c.name.slice(0, 40), type: c.type, ...rel(c), chars: c.type === "TEXT" ? c.characters.slice(0, 50) : undefined })).slice(0, 12);
  return { frame: frame.name, h: frame.height, card2: card2 ? { id: card2.id, ...rel(card2) } : null, cells, below };
}
return {
  pulsaL: await probe("2:2", /^Pulsa \d/),
  pulsaD: await probe("2:59", /^Pulsa \d/),
  emoneyL: await probe("3:2", /^Saldo \d/),
  emoneyD: await probe("3:60", /^Saldo \d/),
};
