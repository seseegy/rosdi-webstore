// Read-only audit s442f (Figma): kartu modal sebagai GROUP/RECTANGLE turunan.
const out = { cards: [] };
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
for (const f of frames) {
  if (/^Modal (S&K|Kebijakan Pengembalian|Masuk)/.test(f.name) && !/Desktop/.test(f.name)) {
    const cands = f.findAll((n) => (n.type === "GROUP" || n.type === "RECTANGLE" || n.type === "FRAME") && n.width >= 300 && n.width <= 400 && n.height >= 120 && n.height <= 600);
    for (const c of cands.slice(0, 3)) {
      // jarak tepi kartu ke teks pertama di dalamnya (pakai absoluteBoundingBox)
      const texts = ("findAll" in c) ? c.findAll((n) => n.type === "TEXT") : [];
      let padL = null, padT = null;
      if (texts.length && c.absoluteBoundingBox) {
        const t0 = texts[0].absoluteBoundingBox;
        padL = Math.round(t0.x - c.absoluteBoundingBox.x);
        padT = Math.round(t0.y - c.absoluteBoundingBox.y);
      }
      out.cards.push({ frame: f.name, type: c.type, name: (c.name || "").slice(0, 60), w: Math.round(c.width), h: Math.round(c.height), padL, padT, texts: texts.length });
    }
  }
}
return out;
