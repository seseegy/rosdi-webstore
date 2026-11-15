// Probe read-only Siklus 73 (v2, ringkas): seksi Flash Sale Beranda mobile Light (1:2).
// Hanya anak langsung + teks dengan y 330..700, tanpa nama panjang.
const f = await figma.getNodeByIdAsync("1:2");
if (!f) return { error: "frame 1:2 tidak ditemukan" };
const inY = (n) => n.y >= 330 && n.y <= 720;
const kids = f.children.filter(inY).map((c) => [
  c.id, c.name.slice(0, 28), c.type,
  Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height),
]);
const texts = f.findAllWithCriteria({ types: ["TEXT"] }).filter(inY).map((t) => [
  t.id, (t.characters || "").slice(0, 40),
  Math.round(t.x), Math.round(t.y), Math.round(t.width), Math.round(t.height),
]).sort((a, b) => a[3] - b[3]);
return { frame: f.name, w: Math.round(f.width), h: Math.round(f.height), kids, texts };
