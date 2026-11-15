// Probe read-only batch s001 (lanjutan 2): tipe node kartu, total ringkasan, tile DANA, Blessing, hero dark.
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
function fillsOf(n) {
  const out = [];
  if (Array.isArray(n.fills)) for (const p of n.fills) if (p && p.type === "SOLID" && p.color) out.push(hex(p.color).toLowerCase());
  return out;
}
const page = figma.currentPage;
const frames = page.children.filter((n) => n.type === "FRAME");
const out = { cardTypes: {}, cardRadius: {}, cardNon14: [], summaryTotal: [], danaTile: null, blessing: [], heroDarkFill: null, nomPriceSize: [] };
for (const f of frames) {
  // anak langsung frame: tipe + radius
  for (const ch of f.children) {
    const k = ch.type + "/r" + (typeof ch.cornerRadius === "number" ? ch.cornerRadius : "?");
    out.cardTypes[k] = (out.cardTypes[k] || 0) + 1;
    if ((ch.type === "RECTANGLE" || ch.type === "FRAME") && ch.width >= 100 && ch.height >= 40 && typeof ch.cornerRadius === "number") {
      out.cardRadius[ch.cornerRadius] = (out.cardRadius[ch.cornerRadius] || 0) + 1;
      if (ch.cornerRadius !== 14 && out.cardNon14.length < 20) out.cardNon14.push({ frame: f.name, node: ch.name, type: ch.type, r: ch.cornerRadius, w: Math.round(ch.width), h: Math.round(ch.height) });
    }
  }
  const all = f.findAll(() => true);
  for (const n of all) {
    if (n.type === "TEXT") {
      const c = n.characters || "";
      if (/Blessing of the Welkin Moon/.test(c) && out.blessing.length < 4) out.blessing.push({ frame: f.name, chars: c.slice(0, 40), w: Math.round(n.width), size: n.fontSize, h: Math.round(n.height) });
      if (/^Rp[\d.]+$/.test(c.trim()) && /Produk Game \(6 Langkah\) — Light/.test(f.name) && n.fontSize === 12) { /* nom prices, counted below */ }
    }
  }
  // ringkasan Produk Game Light: teks "Total" + nilai di dekatnya (y berdekatan)
  if (/^Produk Game \(6 Langkah\) — Light$/.test(f.name)) {
    const texts = f.findAll((n) => n.type === "TEXT");
    const tot = texts.find((t) => t.characters.trim() === "Total");
    if (tot) {
      const near = texts.filter((t) => Math.abs(t.y - tot.y) < 24 && /^Rp/.test(t.characters.trim())).map((t) => ({ chars: t.characters.trim(), size: t.fontSize, y: Math.round(t.y) }));
      out.summaryTotal.push({ totalLabelSize: tot.fontSize, totalY: Math.round(tot.y), near });
    }
    // harga nominal: semua teks Rp di area y 400-900 (grid nominal)
    const nomPrices = texts.filter((t) => /^Rp[\d.]+$/.test(t.characters.trim()) && t.y > 400 && t.y < 900).map((t) => ({ chars: t.characters.trim(), size: t.fontSize }));
    out.nomPriceSize = nomPrices.slice(0, 5);
  }
  // tile DANA di E-Wallet Light
  if (/^E-Wallet — Light$/.test(f.name)) {
    const tiles = f.findAll((n) => /DANA|DN/i.test(n.name));
    out.danaTile = tiles.slice(0, 6).map((n) => ({ name: n.name, type: n.type, fills: fillsOf(n), r: typeof n.cornerRadius === "number" ? n.cornerRadius : null, w: Math.round(n.width) }));
  }
  // hero dark: rectangle besar di atas Beranda Dark (y 60-300, w ~358)
  if (/^Beranda — Dark$/.test(f.name)) {
    const cands = f.children.filter((n) => n.type === "RECTANGLE" && n.width > 300 && n.height > 100 && n.y > 40 && n.y < 300);
    out.heroDarkFill = cands.map((n) => ({ name: n.name, fills: fillsOf(n), x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height), r: n.cornerRadius }));
  }
}
return out;
