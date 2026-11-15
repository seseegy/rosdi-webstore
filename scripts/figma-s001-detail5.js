// Probe read-only batch s001 (lanjutan 5): game apa tile #0EA5E9 di Beranda Light?
// Cari teks terdekat di bawah/kanan tile (nama game kartu itu).
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
function abs(n) { const t = n.absoluteTransform; return t ? { x: t[0][2], y: t[1][2] } : { x: n.x, y: n.y }; }
const page = figma.currentPage;
const frames = page.children.filter((n) => n.type === "FRAME");
const out = [];
for (const f of frames) {
  if (!/^Beranda — Light$/.test(f.name)) continue;
  const fa = abs(f);
  const tiles = [];
  for (const n of f.findAll(() => true)) {
    if (Array.isArray(n.fills)) for (const p of n.fills) {
      if (p && p.type === "SOLID" && p.color && hex(p.color).toLowerCase() === "#0ea5e9") tiles.push(n);
    }
  }
  for (const t of tiles) {
    const ta = abs(t);
    const near = f.findAll((n) => n.type === "TEXT").filter((n) => {
      const na = abs(n);
      return na.y >= ta.y - 10 && na.y <= ta.y + 120 && na.x >= ta.x - 20 && na.x <= ta.x + 220;
    }).map((n) => ({ chars: n.characters.slice(0, 40), x: Math.round(abs(n).x - fa.x), y: Math.round(abs(n).y - fa.y) }));
    out.push({ tile: { x: Math.round(ta.x - fa.x), y: Math.round(ta.y - fa.y), w: Math.round(t.width) }, near });
  }
}
return out;
