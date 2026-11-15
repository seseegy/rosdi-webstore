// Probe kecil s437b: frame mana yang memakai font-weight Extra Bold (800),
// + node stroke 1.25/1.6 ada di frame mana.
const out = [];
for (const f of figma.currentPage.children) {
  if (f.type !== "FRAME") continue;
  let eb = 0, s125 = 0, s16 = 0;
  const ebSamples = [];
  for (const n of f.findAll()) {
    if (n.type === "TEXT" && n.fontName && n.fontName.style === "Extra Bold") {
      eb++;
      if (ebSamples.length < 4) ebSamples.push(n.characters.slice(0, 40));
    }
    if (n.strokeWeight === 1.25) s125++;
    if (n.strokeWeight && Math.abs(n.strokeWeight - 1.6) < 0.01) s16++;
  }
  if (eb || s125 || s16) out.push([f.name, eb, ebSamples, s125, s16]);
}
return { frames: out, count: out.length };
