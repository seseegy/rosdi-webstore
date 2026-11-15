// Probe Figma s459c (read-only): rect kartu nominal 28:2 / 30:2 (lebar 180-260).
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: Math.round(b.y * 10) / 10, h: Math.round(b.height * 10) / 10, w: Math.round(b.width * 10) / 10, x: Math.round(b.x * 10) / 10 } : null; };
const out = {};
for (const [key, fid] of Object.entries({ tsel28: "28:2", pln30: "30:2" })) {
  const fr = F(fid);
  const rects = fr.findAll((n) => (n.type === "RECT" || n.type === "FRAME") && n.absoluteBoundingBox
    && n.absoluteBoundingBox.width >= 180 && n.absoluteBoundingBox.width <= 260
    && n.absoluteBoundingBox.height >= 40 && n.absoluteBoundingBox.height <= 120)
    .map((n) => ({ nama: n.name, tipe: n.type, ...box(n) }));
  out[key] = { frame: fr.name, jumlahRect: rects.length, rects: rects.slice(0, 20) };
}
return out;
