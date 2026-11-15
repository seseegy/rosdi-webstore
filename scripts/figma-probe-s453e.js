// Probe Figma s453 ide 70 lanjutan (perbaikan id Dark: 30:241, bukan 30:259).
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const F = (id) => figma.getNodeById(id);
const out = {};
const targets = [
  ["Token PLN Light (mobile)", "2:116"],
  ["Token PLN Dark (mobile)", "2:181"],
  ["Token PLN Desktop Light", "30:2"],
  ["Token PLN Desktop Dark", "30:241"],
];
for (const pair of targets) {
  const name = pair[0];
  const id = pair[1];
  const fr = F(id);
  if (!fr || fr.type !== "FRAME") { out[name] = "BUKAN-FRAME: " + (fr ? fr.type : null); continue; }
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /tidak bisa dibatalkan/i.test(x.characters));
  if (!t) { out[name] = "TEKS-TIDAK-ADA"; continue; }
  const f = t.fills && t.fills[0];
  out[name] = { fill: f && f.type === "SOLID" ? hex(f.color) : (f ? f.type : null), size: t.fontSize };
}
return out;
