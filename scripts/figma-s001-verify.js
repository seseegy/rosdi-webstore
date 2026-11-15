// Verifikasi pasca-perbaikan batch s001: hitung sisa #0EA5E9 / #1E40AF,
// dan fill hero (rect 358x140) + teks "Mulai top up" di 12 frame klon Beranda mobile.
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
const page = figma.currentPage;
const frames = page.children.filter((n) => n.type === "FRAME");
let sky = 0, blue800 = 0;
const heroes = [];
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    if (Array.isArray(n.fills)) for (const p of n.fills) {
      if (p && p.type === "SOLID" && p.color) {
        const h = hex(p.color).toLowerCase();
        if (h === "#0ea5e9") sky++;
        if (h === "#1e40af") blue800++;
      }
    }
    if (n.type === "RECTANGLE" && Math.round(n.width) === 358 && Math.round(n.height) === 140 && Math.round(n.x) === 16 && Math.round(n.y) === 140 && f.width === 390) {
      const fl = n.fills.filter((p) => p && p.type === "SOLID" && p.color).map((p) => hex(p.color).toLowerCase());
      heroes.push({ frame: f.name, fills: fl, r: n.cornerRadius });
    }
  }
}
return { skyRemaining: sky, blue800Remaining: blue800, heroes };
