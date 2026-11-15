// Probe read-only Siklus 68: peta struktur frame Beranda mobile Light (1:2) —
// daftar semua anak langsung (nama, tipe, x/y/w/h) + semua teks (chars, y),
// untuk merencanakan rebuild seksi "Pulsa, Data & PLN" + trust agar cocok Home.jsx.
const f = await figma.getNodeByIdAsync("1:2");
if (!f) return { error: "frame 1:2 tidak ditemukan" };
const kids = f.children.map((c) => ({
  id: c.id, name: c.name, type: c.type,
  x: Math.round(c.x), y: Math.round(c.y),
  w: Math.round(c.width), h: Math.round(c.height),
}));
const texts = f.findAllWithCriteria({ types: ["TEXT"] }).map((t) => ({
  id: t.id, name: t.name, chars: (t.characters || "").slice(0, 70),
  x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height),
})).sort((a, b) => a.y - b.y);
return { frame: f.name, w: Math.round(f.width), h: Math.round(f.height), nKids: kids.length, kids, nTexts: texts.length, texts };
