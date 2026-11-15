// Probe read-only Siklus 69b: (a) teks ".more" di frame desktop (20:2) —
// geometri + font sebagai acuan; (b) simpul pertama di bawah sec-head
// (y>543) di Beranda mobile 1:2 — untuk hitung geser bila .more 2 baris.
const out = {};
const desk = await figma.getNodeByIdAsync("20:2");
if (desk) {
  out.desktopMore = desk.findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => (t.characters || "").includes("Harga mulai dari"))
    .map((t) => ({
      id: t.id, chars: t.characters, x: Math.round(t.x), y: Math.round(t.y),
      w: Math.round(t.width), h: Math.round(t.height), fs: t.fontSize,
      font: t.fontName.family + " " + t.fontName.style,
      align: t.textAlignHorizontal, resize: t.textAutoResize,
    }));
}
const home = await figma.getNodeByIdAsync("1:2");
if (home) {
  const below = home.children
    .filter((c) => c.y > 543)
    .sort((a, b) => a.y - b.y)
    .slice(0, 6)
    .map((c) => ({
      id: c.id, name: c.name, type: c.type,
      x: Math.round(c.x), y: Math.round(c.y),
      w: Math.round(c.width), h: Math.round(c.height),
    }));
  out.belowSecHead = below;
  // h2 + more saat ini
  const h2 = home.findAllWithCriteria({ types: ["TEXT"] }).find((t) => t.characters === "Populer");
  const more = home.findAllWithCriteria({ types: ["TEXT"] }).find((t) => t.characters === "Lihat semua");
  out.secHead = {
    h2: h2 ? { id: h2.id, x: h2.x, y: h2.y, w: h2.width, h: h2.height, fs: h2.fontSize } : null,
    more: more ? { id: more.id, x: more.x, y: more.y, w: more.width, h: more.height, fs: more.fontSize, resize: more.textAutoResize } : null,
  };
}
return out;
