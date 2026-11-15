// Probe Figma s453 ide 70 lanjutan: fill peringatan "tidak bisa dibatalkan"
// di frame Token PLN mobile + desktop (Light+Dark), sebelum edit.
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const F = (id) => figma.getNodeById(id);
const out = {};
for (const [name, id] of [["Token PLN Light (mobile)", "2:116"], ["Token PLN Desktop Light", "30:2"], ["Token PLN Desktop Dark", "30:259"]]) {
  const fr = F(id);
  if (!fr) { out[name] = "FRAME-TIDAK-ADA"; continue; }
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /tidak bisa dibatalkan/i.test(x.characters));
  if (!t) { out[name] = "TEKS-TIDAK-ADA"; continue; }
  const f = t.fills && t.fills[0];
  out[name] = { text: t.characters.slice(0, 60), fill: f && f.type === "SOLID" ? hex(f.color) : (f ? f.type : null) };
}
return out;
