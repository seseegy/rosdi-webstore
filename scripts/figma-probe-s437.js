// Probe Figma batch s437 (ide 81-90): font, weight, efek, stroke, angka
// non-Rp, nilai demo, ruang kosong frame, grid desktop, gap Light/Dark,
// Section. Read-only, agregat ringkas agar < 48KB.
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
const sections = figma.currentPage.children.filter((n) => n.type === "SECTION").map((s) => s.name);
const fonts = {};
const weights = {};
const strokes = {};
let shadowFrames = [];
const demoKeys = ["12345678", "1234", "081234567890", "543210987654", "nama@email.com"];
const demo = {};
for (const k of demoKeys) demo[k] = 0;
const demoFrames = {};
const nonRp = [];
const empty = [];
const frameInfo = [];
for (const f of frames) {
  const fb = f.absoluteBoundingBox;
  frameInfo.push([f.name, Math.round(fb.x), Math.round(fb.y), Math.round(fb.width), Math.round(fb.height)]);
  let maxBottom = fb.y;
  let shadowCount = 0;
  let nonRpCount = 0;
  const samples = [];
  for (const n of f.findAll()) {
    const b = n.absoluteBoundingBox;
    if (b && b.y + b.height > maxBottom) maxBottom = b.y + b.height;
    if (n.effects && n.effects.some((e) => e.type === "DROP_SHADOW" && e.visible !== false)) shadowCount++;
    if (n.strokeWeight !== undefined && n.strokes && n.strokes.length) {
      const w = String(n.strokeWeight);
      strokes[w] = (strokes[w] || 0) + 1;
    }
    if (n.type === "TEXT") {
      const fam = n.fontName && n.fontName.family ? n.fontName.family : "?";
      const sty = n.fontName && n.fontName.style ? n.fontName.style : "?";
      fonts[fam] = (fonts[fam] || 0) + 1;
      weights[sty] = (weights[sty] || 0) + 1;
      const ch = n.characters || "";
      for (const k of demoKeys) {
        if (ch.indexOf(k) !== -1) {
          demo[k]++;
          if (!demoFrames[k]) demoFrames[k] = [];
          if (demoFrames[k].length < 8) demoFrames[k].push(f.name);
        }
      }
      if (/\d/.test(ch) && ch.indexOf("Rp") === -1) {
        nonRpCount++;
        if (samples.length < 6) samples.push(ch.slice(0, 48));
      }
    }
  }
  if (shadowCount) shadowFrames.push([f.name, shadowCount]);
  if (nonRpCount) nonRp.push([f.name, nonRpCount, samples]);
  empty.push([f.name, Math.round(fb.height), Math.round(maxBottom - fb.y), Math.round(fb.height - (maxBottom - fb.y))]);
}
return {
  frameCount: frames.length,
  sections,
  fonts,
  weights,
  strokes,
  shadowFrames: shadowFrames.slice(0, 40),
  shadowFrameCount: shadowFrames.length,
  demo,
  demoFrames,
  nonRp,
  empty,
  frameInfo,
};
