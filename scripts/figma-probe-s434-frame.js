// Probe s434-perframe — read-only: teks + geometri SATU frame.
// __FID__ diganti driver dengan id frame; __LABEL__ dengan label.
// Dipakai batch s434 (ide 1,3,5,6,9,10,14,15,20-30,51,60-70,71-80).
const FID = "__FID__";
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;
const hex = (fills) => {
  if (!fills || !fills.length) return null;
  const s = fills.find((x) => x.type === "SOLID");
  if (!s) return fills[0].type;
  const c = s.color;
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return "#" + to(c.r) + to(c.g) + to(c.b);
};
const f = byId[FID];
if (!f) return { error: "FRAME HILANG " + FID };
const texts = f.findAllWithCriteria({ types: ["TEXT"] }).map((t) => ({
  c: t.characters.trim(), fs: t.fontSize, fill: hex(t.fills),
  x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height),
})).filter((t) => t.c);
const bars = f.findAllWithCriteria({ types: ["RECTANGLE"] })
  .filter((r) => r.height <= 8 && r.width > 40)
  .map((r) => ({ name: r.name, fill: hex(r.fills), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }));
return { frame: FID, name: f.name, nTexts: texts.length, texts, bars };
