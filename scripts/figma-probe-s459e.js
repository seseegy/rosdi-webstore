// Diagnostik struktur 28:2: semua turunan di rentang y Step2Card + hitung per tipe.
const F = (id) => figma.getNodeById(id);
const r1 = (n) => Math.round(n * 10) / 10;
const out = {};
const fr = F("28:2");
const counts = {};
fr.findAll((n) => { counts[n.type] = (counts[n.type] || 0) + 1; return false; });
out.countsByType = counts;
out.totalDescendants = fr.findAll(() => true).length;
out.frames = fr.findAll((n) => n.type === "FRAME").map((n) => n.name);
const inStep2 = fr.findAll((n) => {
  const b = n.absoluteBoundingBox;
  return b && b.y >= 15600 && b.y <= 16050 && n.type !== "TEXT";
}).map((n) => ({ nama: n.name, tipe: n.type, y: r1(n.absoluteBoundingBox.y), h: r1(n.absoluteBoundingBox.height), w: r1(n.absoluteBoundingBox.width), x: r1(n.absoluteBoundingBox.x) }));
out.inStep2NonText = inStep2;
return out;
