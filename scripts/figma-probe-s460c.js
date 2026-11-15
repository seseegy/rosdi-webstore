// Probe Figma s460c (read-only): rect kartu flash di Beranda mobile 1:2,
// band y 380-720 (semua node, agar tinggi kartu flash mobile terukur).
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const fr = F("1:2");
const nodes = fr.findAll((n) => {
  const b = n.absoluteBoundingBox;
  return b && b.y >= 380 && b.y <= 720 && n.type !== "TEXT";
}).map((n) => ({ nama: n.name, tipe: n.type, ...box(n) }));
const out = { frame: fr.name, nodes };
return out;
