// Read-only s440 (bagian C): tanggal demo saja — pola ketat agar tidak
// menangkap fragmen harga (Rp1.650 mengandung "1.65").
const PATTERNS = {
  tglSlash: /\d{1,2}\/\d{1,2}\/\d{4}/,
  tglTitik: /\d{1,2}\.\d{1,2}\.\d{4}/,
  jamDemo: /\d{2}\.\d{2}/,
  nov2026: /Nov(ember)? 2026|2026/,
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
        if (out[k].samples.length < 8) out[k].samples.push({ frame: f.name, chars: s.slice(0, 80) });
      }
    }
  }
}
return { part: "C", patterns: out, frameCount: frames.length };
