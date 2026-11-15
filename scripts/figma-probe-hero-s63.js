// Read-only: ukur rect hero di frame pencarian + modal + Beranda (Siklus 63).
// Dugaan visual: hero meluber ke kanan frame di screenshot mlbb/zzz.
async function probe(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const fb = frame.absoluteBoundingBox;
  const rel = n => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const rects = frame.findAllWithCriteria({ types: ["RECTANGLE"] })
    .filter(r => r.height >= 100 && r.height <= 200)
    .map(r => ({ id: r.id, name: r.name, ...rel(r) }));
  return { frame: frame.name, frameW: frame.width, rects };
}
return {
  berandaL: await probe("1:2"),
  modalSkL: await probe("10:2"),
  modalRefundL: await probe("13:2"),
  mlbbL: await probe("15:2"),
  zzzL: await probe("16:2"),
};
