// Probe read-only Siklus 132: struktur frame Sukses mobile (4:2 Light / 4:29
// Dark) sebagai sumber klon frame "Sukses — Pascabayar" + baris y terbawah
// file. Dijalankan lewat use_figma; tanpa figma.notify.
function dump(id) {
  const f = figma.getNodeById(id);
  if (!f) return { id, error: "tidak ditemukan" };
  const kids = f.children.map((n) => ({
    name: n.name, type: n.type, x: Math.round(n.x), y: Math.round(n.y),
    w: Math.round(n.width), h: Math.round(n.height),
    chars: ("characters" in n) ? n.characters.slice(0, 80) : undefined,
  }));
  return { id, name: f.name, x: f.x, y: f.y, w: f.width, h: f.height, children: kids };
}
let bottom = 0, bottomName = "";
for (const n of figma.currentPage.children) {
  if (n.type === "FRAME" && n.y + n.height > bottom) { bottom = n.y + n.height; bottomName = n.name; }
}
return { light: dump("4:2"), dark: dump("4:29"), bottom, bottomName, nextY: bottom + 140 };
