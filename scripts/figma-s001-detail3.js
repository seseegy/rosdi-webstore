// Probe read-only batch s001 (lanjutan 3): identifikasi node off-token #0EA5E9 & #1E40AF,
// serta cari teks "Welkin" (Blessing) di semua frame.
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
function abs(n) { const t = n.absoluteTransform; return t ? { x: t[0][2], y: t[1][2] } : { x: n.x, y: n.y }; }
const page = figma.currentPage;
const frames = page.children.filter((n) => n.type === "FRAME");
const out = { sky: [], blue800: [], welkin: [], heroLight: null };
for (const f of frames) {
  const fa = abs(f);
  for (const n of f.findAll(() => true)) {
    const fills = [];
    if (Array.isArray(n.fills)) for (const p of n.fills) if (p && p.type === "SOLID" && p.color) fills.push(hex(p.color).toLowerCase());
    if (fills.includes("#0ea5e9")) out.sky.push({ frame: f.name, node: n.name, type: n.type, x: Math.round(abs(n).x - fa.x), y: Math.round(abs(n).y - fa.y), w: Math.round(n.width), h: Math.round(n.height) });
    if (fills.includes("#1e40af")) out.blue800.push({ frame: f.name, node: n.name, type: n.type, x: Math.round(abs(n).x - fa.x), y: Math.round(abs(n).y - fa.y), w: Math.round(n.width), h: Math.round(n.height), chars: n.type === "TEXT" ? String(n.characters).slice(0, 30) : "" });
    if (n.type === "TEXT" && /Welkin/i.test(n.characters || "")) out.welkin.push({ frame: f.name, chars: String(n.characters).slice(0, 50), w: Math.round(n.width), size: n.fontSize });
  }
  if (/^Beranda — Light$/.test(f.name)) {
    const cands = f.children.filter((n) => n.type === "RECTANGLE" && n.width > 300 && n.height > 100 && n.y > 40 && n.y < 300);
    out.heroLight = cands.map((n) => {
      const fl = [];
      if (Array.isArray(n.fills)) for (const p of n.fills) if (p && p.type === "SOLID" && p.color) fl.push(hex(p.color).toLowerCase());
      return { name: n.name, fills: fl, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height), r: n.cornerRadius };
    });
  }
}
return out;
