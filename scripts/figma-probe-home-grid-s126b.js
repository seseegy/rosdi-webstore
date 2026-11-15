// Probe read-only Siklus 126b: (a) properti teks kartu game mobile Beranda Light (1:2)
// — textAutoResize + fontSize nama/sub/from — dan (b) geometri grid game di
// Beranda Desktop Light (20:2): kartu + y seksi berikutnya.
function cardTexts(frameId, ids) {
  const out = [];
  for (const id of ids) {
    const n = figma.getNodeById(id);
    if (!n) { out.push({ id, error: "hilang" }); continue; }
    out.push({ id, name: n.name, chars: (n.characters || "").slice(0, 40),
      x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height),
      auto: n.textAutoResize, fs: n.fontSize, lh: n.lineHeight && n.lineHeight.unit ? n.lineHeight.value : n.lineHeight });
  }
  return out;
}
const mobile = cardTexts("1:2", ["206:25", "206:26", "206:27", "206:22", "206:66", "206:65"]);
const d = figma.getNodeById("20:2");
const dkids = d.children.map((c) => ({ id: c.id, name: c.name, type: c.type,
  x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }))
  .filter((c) => c.y >= 380 && c.y <= 900);
return { frameH: Math.round(d.height), mobile, desktopKids: dkids };
