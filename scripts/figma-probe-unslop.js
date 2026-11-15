// Probe unslop (read-only): sensus font style, letterSpacing, glif ikon, elips hero.
const page = figma.currentPage;
const frames = page.children.filter(n => n.type === "FRAME");
const fontStyles = {};
const lsVals = {};
let glyphs = { bolt: 0, tel: 0, check: 0, rp: 0 };
const glyphFrames = {};
const ellipses = [];
let radius11 = 0;
let textTotal = 0;
for (const fr of frames) {
  const texts = fr.findAll(n => n.type === "TEXT");
  for (const t of texts) {
    textTotal++;
    const fn = t.fontName;
    if (fn && fn !== figma.mixed) fontStyles[fn.style] = (fontStyles[fn.style] || 0) + 1;
    const ls = t.letterSpacing;
    if (ls && ls !== figma.mixed) {
      const k = ls.unit + ":" + ls.value;
      lsVals[k] = (lsVals[k] || 0) + 1;
    }
    const c = t.characters;
    if (c === "⚡") { glyphs.bolt++; (glyphFrames[fr.id] = glyphFrames[fr.id] || []).push("bolt@" + Math.round(t.x) + "," + Math.round(t.y) + " parent=" + (t.parent && t.parent.type)); }
    if (c === "☎") { glyphs.tel++; (glyphFrames[fr.id] = glyphFrames[fr.id] || []).push("tel"); }
    if (c === "✓") glyphs.check++;
    if (c === "Rp") glyphs.rp++;
  }
  const els = fr.findAll(n => n.type === "ELLIPSE");
  for (const e of els) {
    ellipses.push({ frame: fr.id, name: e.name, w: Math.round(e.width), h: Math.round(e.height), x: Math.round(e.x), y: Math.round(e.y), parent: e.parent && e.parent.type });
  }
  const rects = fr.findAll(n => (n.type === "RECTANGLE" || n.type === "FRAME") && "cornerRadius" in n);
  for (const r of rects) if (r.cornerRadius === 11) radius11++;
}
return { frames: frames.length, textTotal, fontStyles, lsVals, glyphs, glyphFrames, ellipses: ellipses.slice(0, 40), ellipseCount: ellipses.length, radius11 };
