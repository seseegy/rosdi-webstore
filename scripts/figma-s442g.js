// Read-only audit s442g (Figma): padding kartu modal via absoluteBoundingBox.
const out = { modals: [] };
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
for (const f of frames) {
  if (/^Modal (S&K|Kebijakan Pengembalian|Masuk)/.test(f.name) && !/Desktop/.test(f.name)) {
    const rects = f.findAll((n) => n.type === "RECTANGLE" && Math.round(n.width) === 358).map((r) => ({ x: Math.round(r.absoluteBoundingBox.x), y: Math.round(r.absoluteBoundingBox.y), w: Math.round(r.width), h: Math.round(r.height) }));
    const texts = f.findAll((n) => n.type === "TEXT").map((t) => ({ ch: (t.characters || "").slice(0, 40), x: Math.round(t.absoluteBoundingBox.x), y: Math.round(t.absoluteBoundingBox.y), w: Math.round(t.width), h: Math.round(t.height) }));
    // kartu = rect yang memuat teks judul modal (teks pertama yang y-nya di dalam rect)
    const card = rects.map((r) => {
      const inside = texts.filter((t) => t.y >= r.y && t.y < r.y + r.h && t.x >= r.x && t.x < r.x + r.w);
      if (!inside.length) return null;
      const first = inside[0], last = inside[inside.length - 1];
      return { rectY: r.y, rectH: r.h, padTop: first.y - r.y, padLeft: first.x - r.x, padBottom: (r.y + r.h) - (last.y + last.h), padRight: (r.x + r.w) - (first.x + first.w), nTexts: inside.length, firstText: first.ch };
    }).filter(Boolean);
    out.modals.push({ frame: f.name, rects: rects.length, card });
  }
}
return out;
