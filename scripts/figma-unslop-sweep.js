// Sweep unslop untuk rentang frame [RANGE_START, RANGE_END) di halaman ini:
// 1) font Bold/Extra Bold -> Semi Bold (unslop: bobot maks 600)
// 2) letterSpacing negatif -> 0
// 3) cornerRadius 11 -> 10 (radius kontrol)
// 4) glif trust "⚡"/"☎" -> ikon vektor garis (bolt/headset, stroke = warna glif)
const RANGE_START = __START__;
const RANGE_END = __END__;
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
const frames = figma.currentPage.children.filter(n => n.type === "FRAME").slice(RANGE_START, RANGE_END);
const BOLT = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="HEX" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
const HEADSET = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="HEX" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>';
function hexOf(node) {
  const f = node.fills;
  if (Array.isArray(f)) {
    for (const p of f) {
      if (p.type === "SOLID" && p.color) {
        const c = p.color;
        const h = v => Math.round(v * 255).toString(16).padStart(2, "0");
        return "#" + h(c.r) + h(c.g) + h(c.b);
      }
    }
  }
  return "#2563eb";
}
let fonts = 0, ls = 0, radii = 0, icons = 0;
for (const fr of frames) {
  const texts = fr.findAll(n => n.type === "TEXT");
  const glyphTargets = [];
  for (const t of texts) {
    // font weight
    if (t.fontName === figma.mixed) {
      const segs = t.getStyledTextSegments(["fontName"]);
      for (const s of segs) {
        if (s.fontName.style === "Bold" || s.fontName.style === "Extra Bold") {
          t.setRangeFontName(s.start, s.end, { family: s.fontName.family, style: "Semi Bold" });
          fonts++;
        }
      }
    } else if (t.fontName.style === "Bold" || t.fontName.style === "Extra Bold") {
      t.fontName = { family: t.fontName.family, style: "Semi Bold" };
      fonts++;
    }
    // letter spacing negatif
    if (t.letterSpacing !== figma.mixed && t.letterSpacing && t.letterSpacing.value < 0) {
      t.letterSpacing = { value: 0, unit: t.letterSpacing.unit };
      ls++;
    }
    if (t.characters === "⚡" || t.characters === "☎") glyphTargets.push(t);
  }
  // radius kontrol 11 -> 10
  const shapes = fr.findAll(n => "cornerRadius" in n && n.type !== "TEXT");
  for (const sh of shapes) {
    if (sh.cornerRadius === 11) { sh.cornerRadius = 10; radii++; }
  }
  // glif -> ikon vektor
  for (const g of glyphTargets) {
    const parent = g.parent;
    if (!parent) continue;
    const idx = parent.children.indexOf(g);
    const bb = g.absoluteBoundingBox;
    if (!bb) continue;
    const hex = hexOf(g);
    const svg = (g.characters === "⚡" ? BOLT : HEADSET).replace("HEX", hex);
    const node = figma.createNodeFromSvg(svg);
    node.name = g.characters === "⚡" ? "IconBolt" : "IconHeadset";
    // posisi: pusatkan pada pusat glif, relatif ke parent
    const pbb = parent.absoluteBoundingBox;
    node.x = (bb.x - pbb.x) + bb.width / 2 - node.width / 2;
    node.y = (bb.y - pbb.y) + bb.height / 2 - node.height / 2;
    parent.insertChild(Math.max(0, idx), node);
    g.remove();
    icons++;
  }
}
return { frames: frames.length, fonts, ls, radii, icons };
