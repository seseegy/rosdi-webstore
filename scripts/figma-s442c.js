// Read-only audit s442c (Figma): padding kartu modal ide 86 — ukur frame modal
// itu sendiri (kartu = frame) + offset teks pertama/terakhir.
const out = { modals: [] };
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
for (const f of frames) {
  if (/^Modal (S&K|Kebijakan Pengembalian|Masuk)/.test(f.name)) {
    const texts = f.findAll((n) => n.type === "TEXT");
    const first = texts[0], last = texts[texts.length - 1];
    out.modals.push({
      frame: f.name, w: Math.round(f.width), h: Math.round(f.height),
      autoPad: [f.paddingLeft, f.paddingTop, f.paddingRight, f.paddingBottom],
      firstTextOffset: first ? { x: Math.round(first.x - f.x), y: Math.round(first.y - f.y) } : null,
      lastTextBottom: last ? Math.round((f.y + f.height) - (last.y + last.height)) : null,
      textCount: texts.length,
      childrenTypes: f.children.map((c) => c.type + ":" + (c.name || "").slice(0, 30)).slice(0, 8),
    });
  }
}
return out;
