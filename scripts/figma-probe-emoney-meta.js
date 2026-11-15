// Read-only: ukur teks meta "Admin sudah termasuk" di frame mobile E-Wallet (Siklus 53).
async function probe(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const fb = frame.absoluteBoundingBox;
  const rel = n => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const metas = frame.findAllWithCriteria({ types: ["TEXT"] }).filter(t => t.characters === "Admin sudah termasuk");
  const out = [];
  for (const m of metas) {
    const r = rel(m);
    const segs = m.getStyledTextSegments(["fontName", "fontSize", "lineHeight"]);
    // sel = RECTANGLE yang memuat meta ini (x-12, y-? cari rect yang mengandung titik tengah meta)
    const cx = m.x + m.width / 2, cy = m.y + m.height / 2;
    const cell = frame.children.find(c => c.type === "RECTANGLE" && c.x <= cx && cx <= c.x + c.width && c.y <= cy && cy <= c.y + c.height);
    const price = frame.findAllWithCriteria({ types: ["TEXT"] }).find(t => t.characters.startsWith("Rp") && Math.abs(t.x - m.x) < 1 && t.y > m.y && t.y < m.y + 40);
    out.push({ id: m.id, ...r, fontSize: segs[0] ? segs[0].fontSize : null, lineHeight: segs[0] ? segs[0].lineHeight : null, textAutoResize: m.textAutoResize, cell: cell ? { id: cell.id, ...rel(cell) } : null, price: price ? { id: price.id, ...rel(price), chars: price.characters } : null });
  }
  return { frame: frame.name, frameH: frame.height, metas: out };
}
return { emoneyL: await probe("3:2"), emoneyD: await probe("3:60") };
