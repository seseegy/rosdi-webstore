// Probe read-only Siklus 153b: struktur anak langsung frame Beranda Desktop
// Light (20:2) di area seksi util (y 1143..1850) — tipe/nama/geometri.
function probe(frameId) {
  const f = figma.getNodeById(frameId);
  if (!f) return { frameId, error: "tidak ditemukan" };
  const kids = [];
  for (const c of f.children) {
    if (c.y < 1100 || c.y > 1900) continue;
    kids.push({ id: c.id, type: c.type, name: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) });
  }
  kids.sort((a, b) => a.y - b.y || a.x - b.x);
  return { frameId, h: Math.round(f.height), n: kids.length, kids: kids.slice(0, 80) };
}
return { light: probe("20:2") };
