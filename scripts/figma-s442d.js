// Read-only audit s442d (Figma): anak langsung frame modal — cari kartu modal.
const out = { modals: [] };
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
for (const f of frames) {
  if (/^Modal (S&K|Kebijakan Pengembalian|Masuk)/.test(f.name) && !/Desktop/.test(f.name)) {
    const kids = f.children.filter((c) => c.type === "FRAME" && c.width >= 280 && c.width <= 420 && c.height < 900).map((c) => ({
      type: c.type, name: (c.name || "").slice(0, 60),
      x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height),
      pad: [c.paddingLeft, c.paddingTop, c.paddingRight, c.paddingBottom],
      radius: typeof c.cornerRadius === "number" ? c.cornerRadius : null,
    }));
    out.modals.push({ frame: f.name, w: Math.round(f.width), h: Math.round(f.height), kids });
  }
}
return out;
