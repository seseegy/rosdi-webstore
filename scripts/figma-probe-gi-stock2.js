// Read-only: ukur kartu Langkah 3 Genshin + konfigurasi catatan stok MLBB (pola acuan) (Siklus 60).
async function probeGi(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const fb = frame.absoluteBoundingBox;
  const rel = n => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const rects = frame.findAllWithCriteria({ types: ["RECTANGLE"] })
    .filter(r => Math.abs(r.x - 16) < 1 && Math.abs(r.width - 358) < 1 && r.y >= 540 && r.y <= 700)
    .map(r => ({ id: r.id, name: r.name, ...rel(r) }));
  const title = frame.findAllWithCriteria({ types: ["TEXT"] }).find(t => t.characters === "Jumlah Pembelian");
  const note = frame.findAllWithCriteria({ types: ["TEXT"] }).find(t => t.characters === "Stok: tersedia");
  return { frame: frame.name, frameH: frame.height, rects, title: title ? { id: title.id, ...rel(title) } : null, note: note ? { id: note.id, ...rel(note) } : null };
}
async function probeMlbb(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const fb = frame.absoluteBoundingBox;
  const rel = n => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const note = frame.findAllWithCriteria({ types: ["TEXT"] }).find(t => t.characters === "Stok tersedia · maksimal 10 per transaksi");
  const rects = frame.findAllWithCriteria({ types: ["RECTANGLE"] })
    .filter(r => Math.abs(r.x - 16) < 1 && Math.abs(r.width - 358) < 1 && note && r.y <= note.y && r.y + r.height >= note.y + note.height)
    .map(r => ({ id: r.id, name: r.name, ...rel(r) }));
  return { frame: frame.name, note: note ? { id: note.id, ...rel(note), textAutoResize: note.textAutoResize } : null, cardRects: rects };
}
return { giL: await probeGi("6:2"), giD: await probeGi("6:108"), mlbbL: await probeMlbb("1:208") };
