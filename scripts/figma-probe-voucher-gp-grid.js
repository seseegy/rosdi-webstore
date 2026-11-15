// Read-only: struktur grid nominal frame Voucher Google Play mobile (3:118 Light, 3:177 Dark) — Siklus 58.
// Tujuan: konfirmasi apakah grid masih 3 kolom (cacat pola PLN Siklus 29 / MLBB Siklus 50 / Pulsa-EWallet Siklus 52).
async function probe(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const fb = frame.absoluteBoundingBox;
  const rel = n => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const title = frame.children.find(c => c.type === "TEXT" && c.characters === "Pilih Nominal");
  const card2 = title ? frame.children.find(c => c.type === "RECTANGLE" && c.width === 358 && c.y < title.y && c.y + c.height > title.y) : null;
  const names = frame.children.filter(c => c.type === "TEXT" && /^Saldo \d/.test(c.characters));
  const cells = [];
  for (const nm of names) {
    const r = rel(nm);
    // sel = RECTANGLE yang menaungi teks nama (nama di dalam sel, offset kecil)
    const rect = frame.children.find(c => c.type === "RECTANGLE" && c.x <= r.x && c.x + c.width >= r.x + r.w && c.y <= r.y && c.y + c.height >= r.y + r.h && c.width < 300);
    const price = frame.children.find(c => c.type === "TEXT" && c.characters.startsWith("Rp") && Math.abs(c.x - r.x) < 1 && c.y > r.y && c.y < r.y + 40);
    const meta = frame.children.find(c => c.type === "TEXT" && c.characters === "Kode dikirim ke email" && Math.abs(c.x - r.x) < 1 && c.y > r.y && c.y < r.y + 40);
    const stroke = rect && rect.strokes.length ? { r: +rect.strokes[0].color.r.toFixed(2), g: +rect.strokes[0].color.g.toFixed(2), b: +rect.strokes[0].color.b.toFixed(2) } : null;
    cells.push({ name: nm.characters, nameId: nm.id, nameBox: r, price: price ? price.characters : null, priceId: price ? price.id : null, metaId: meta ? meta.id : null, rectId: rect ? rect.id : null, rectBox: rect ? rel(rect) : null, sel: !!stroke });
  }
  const gridBottom = cells.length ? Math.max(...cells.map(c => c.rectBox ? c.rectBox.y + c.rectBox.h : c.nameBox.y + 54)) : 0;
  const below = frame.children.filter(c => c.y >= gridBottom - 1 && !cells.some(x => x.rectId === c.id || x.nameId === c.id || x.priceId === c.id || x.metaId === c.id)).map(c => ({ id: c.id, name: c.name.slice(0, 40), type: c.type, ...rel(c), chars: c.type === "TEXT" ? c.characters.slice(0, 50) : undefined })).slice(0, 14);
  return { frame: frame.name, id: frame.id, h: frame.height, titleY: title ? +title.y.toFixed(1) : null, card2: card2 ? { id: card2.id, ...rel(card2) } : null, cells, gridBottom: +gridBottom.toFixed(1), below };
}
return { gpL: await probe("3:118"), gpD: await probe("3:177") };
