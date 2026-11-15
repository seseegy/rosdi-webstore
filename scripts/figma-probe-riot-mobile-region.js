// Probe read-only: dump semua anak langsung frame Valorant mobile Light
// di area Langkah 1 (y absolut 72657..73150) + kartu Langkah 2 (top).
// Siklus 137.
const f = figma.getNodeById("270:2");
if (!f) throw new Error("frame tidak ketemu");
const out = [];
for (const n of f.children) {
  const b = n.absoluteBoundingBox;
  if (!b) continue;
  if (b.y >= 72657 && b.y <= 73180) {
    out.push({ id: n.id, type: n.type, name: n.name.slice(0, 60),
      x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
      ch: n.type === "TEXT" ? n.characters.slice(0, 60) : "" });
  }
}
out.sort((a, b) => a.y - b.y || a.x - b.x);
return { frameY: 72657, count: out.length, nodes: out };
