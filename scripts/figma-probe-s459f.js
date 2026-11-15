// Probe Figma s459f (read-only): rect "Nom Token" di 30:2.
const F = (id) => figma.getNodeById(id);
const r1 = (n) => Math.round(n * 10) / 10;
const fr = F("30:2");
const rects = fr.findAll((n) => n.type === "RECTANGLE" && /^Nom Token/.test(n.name))
  .map((n) => { const b = n.absoluteBoundingBox; return { nama: n.name, x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; });
return { frame: fr.name, jumlah: rects.length, rects };
