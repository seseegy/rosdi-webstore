// Read-only audit s443d (Figma): kartu modal — rect 358 lebar di frame Modal,
// overlap dengan judul modal; radius + tinggi + y.
const out = { modalCards: [] };
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
for (const f of frames) {
  if (!/modal/i.test(f.name)) continue;
  const titles = f.findAll((n) => n.type === "TEXT" && /Masuk ke|Syarat|Kebijakan/.test(n.characters || ""));
  const title = titles[0];
  const cands = f.findAll((n) => (n.type === "RECTANGLE" || n.type === "FRAME") && Math.round(n.width) === 358 && Math.round(n.height) > 100);
  for (const c of cands) {
    let overlapsTitle = false;
    if (title) {
      const tx = title.absoluteTransform[0][2], ty = title.absoluteTransform[1][2];
      const cx = c.absoluteTransform[0][2], cy = c.absoluteTransform[1][2];
      overlapsTitle = tx >= cx && tx <= cx + c.width && ty >= cy && ty <= cy + c.height;
    }
    out.modalCards.push({ frame: f.name, w: Math.round(c.width), h: Math.round(c.height), radius: c.cornerRadius, x: Math.round(c.x), y: Math.round(c.y), overlapsTitle });
  }
}
return out;
