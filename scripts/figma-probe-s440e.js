// Read-only s440 (bagian E): baris metode pulsa di frame Desktop + label
// "biaya RpX" apa pun di frame Desktop (untuk ide 72).
const PATTERNS = {
  pulsaMethod: /Pulsa (Telkomsel|XL)/,
  feeRp: /biaya Rp\d[\d.]*/,
  pct7: /7%/,
  danamonNote: /Danamon/,
};
const out = {};
for (const k of Object.keys(PATTERNS)) out[k] = { count: 0, frames: {}, samples: [] };
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    const s = t.characters;
    for (const k of Object.keys(PATTERNS)) {
      if (PATTERNS[k].test(s)) {
        out[k].count++;
        out[k].frames[f.name] = (out[k].frames[f.name] || 0) + 1;
        if (out[k].samples.length < 10) out[k].samples.push({ frame: f.name, chars: s.slice(0, 90) });
      }
    }
  }
}
return { part: "E", patterns: out, frameCount: frames.length };
