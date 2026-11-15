// Read-only audit s442e (Figma): cari kartu modal di semua turunan frame modal.
const out = { cards: [] };
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
for (const f of frames) {
  if (/^Modal (S&K|Kebijakan Pengembalian|Masuk)/.test(f.name) && !/Desktop/.test(f.name)) {
    const cands = f.findAll((n) => n.type === "FRAME" && n.width >= 300 && n.width <= 400 && n.height >= 120 && n.height <= 600 && /modal|card|kartu/i.test(n.name || ""));
    for (const c of cands.slice(0, 2)) {
      out.cards.push({ frame: f.name, name: (c.name || "").slice(0, 60), w: Math.round(c.width), h: Math.round(c.height), pad: [c.paddingLeft, c.paddingTop, c.paddingRight, c.paddingBottom], radius: c.cornerRadius, layoutMode: c.layoutMode });
    }
    // fallback: frame turunan apa pun selebar 358 (±2) dan tinggi < 600
    if (cands.length === 0) {
      const c2 = f.findAll((n) => n.type === "FRAME" && Math.abs(n.width - 358) <= 2 && n.height < 600);
      for (const c of c2.slice(0, 2)) out.cards.push({ frame: f.name, name: (c.name || "").slice(0, 60) + " (fallback-358)", w: Math.round(c.width), h: Math.round(c.height), pad: [c.paddingLeft, c.paddingTop, c.paddingRight, c.paddingBottom], radius: c.cornerRadius, layoutMode: c.layoutMode });
    }
  }
}
return out;
