// Probe read-only batch s001 (lanjutan 4): teks redeem di frame Voucher,
// sub Indeks Pulsa, spacing grid kartu Beranda Light, veil opacity, hero desktop.
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
const page = figma.currentPage;
const frames = page.children.filter((n) => n.type === "FRAME");
const out = { redeem: [], indexSub: [], berandaCards: [], veil: [], desktopHero: [] };
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    if (n.type === "TEXT") {
      const c = n.characters || "";
      if (/redeem|tukar|aktifkan/i.test(c) && /Voucher|Steam|PlayStation|Google Play/i.test(f.name)) out.redeem.push({ frame: f.name, chars: c.slice(0, 100) });
      if (/langsung isi nomor|terdeteksi otomatis/i.test(c) && /Indeks Pulsa/i.test(f.name)) out.indexSub.push({ frame: f.name, chars: c.slice(0, 120) });
    }
    if (/veil/i.test(n.name) && Array.isArray(n.fills)) {
      out.veil.push({ frame: f.name, fills: n.fills.map((p) => ({ type: p.type, hex: p.color ? hex(p.color).toLowerCase() : null, opacity: p.opacity })) });
    }
  }
  if (/^Beranda — Light$/.test(f.name)) {
    // kartu game: rectangle 150-200 lebar di area grid (y > 900)
    const cards = f.children.filter((n) => n.type === "RECTANGLE" && n.width >= 150 && n.width <= 200 && n.y > 900);
    const rows = {};
    for (const c of cards) {
      const y = Math.round(c.y);
      rows[y] = rows[y] || [];
      rows[y].push({ x: Math.round(c.x), w: Math.round(c.width), h: Math.round(c.height), r: c.cornerRadius });
    }
    out.berandaCards = Object.entries(rows).map(([y, cs]) => ({ y: +y, cards: cs.sort((a, b) => a.x - b.x) }));
  }
  if (/^Beranda — Desktop — (Light|Dark)$/.test(f.name)) {
    const cands = f.children.filter((n) => n.type === "RECTANGLE" && n.width > 1000 && n.height > 100 && n.y > 40 && n.y < 400);
    out.desktopHero.push({ frame: f.name, hero: cands.map((n) => {
      const fl = [];
      if (Array.isArray(n.fills)) for (const p of n.fills) if (p && p.type === "SOLID" && p.color) fl.push(hex(p.color).toLowerCase());
      return { fills: fl, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height), r: n.cornerRadius };
    }) });
  }
}
return out;
