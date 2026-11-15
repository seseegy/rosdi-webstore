// Probe s435 lanjutan — read-only: dump SEMUA teks satu frame mobile
// (mode=text, __FID__) atau pindai "‹"/"▾" di semua frame (mode=glyphs).
// Dipakai audit batch s435 ide A (harga metode mobile) & H (komponen/teks).
const MODE = "__MODE__";
const FID = "__FID__";
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
if (MODE === "glyphs") {
  const out = [];
  for (const frame of figma.currentPage.children) {
    const hits = [];
    for (const t of frame.findAllWithCriteria({ types: ["TEXT"] })) {
      if (t.characters === "‹" || t.characters === "▾" || t.characters === "‹ " || t.characters.includes("▾")) {
        hits.push({ name: t.name, c: t.characters, fs: t.fontSize, x: Math.round(t.absoluteTransform[0][2] - frame.x), y: Math.round(t.absoluteTransform[1][2] - frame.y), w: Math.round(t.width), h: Math.round(t.height) });
      }
    }
    if (hits.length) out.push([frame.id, frame.name, hits]);
  }
  return { frames: out.length, hits: out.reduce((a, f) => a + f[2].length, 0), frames2: out };
}
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;
const f = byId[FID];
if (!f) return { error: "FRAME HILANG " + FID };
const texts = f.findAllWithCriteria({ types: ["TEXT"] }).map((t) => ({
  n: t.name, c: t.characters.slice(0, 60), fs: t.fontSize,
  x: Math.round(t.absoluteTransform[0][2] - f.x), y: Math.round(t.absoluteTransform[1][2] - f.y),
  w: Math.round(t.width), h: Math.round(t.height),
  fill: t.fills && t.fills.length ? hex(t.fills[0].color) : null,
}));
return { frame: FID, name: f.name, w: Math.round(f.width), h: Math.round(f.height), nTexts: texts.length, texts };
