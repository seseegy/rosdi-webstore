// Probe s433b — read-only: dump semua teks "Rp" frame mobile (ide 21-24, 29)
// format kompatibel scripts/check-figma-prices.mjs: {frames:[[frameId,[[nodeId,chars]]]]}
const IDS = ["2:2", "2:116", "3:2", "3:118", "41:2", "100:2", "105:2",
  "1:208", "111:2", "6:2", "114:2", "116:2", "120:2", "270:2", "272:2", "274:2", "277:2", "279:2",
  "1:2", "3:236", "4:2", "77:2", "317:2", "295:74", "311:2"];
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;
const out = { frames: [] };
for (const fid of IDS) {
  const f = byId[fid];
  if (!f) { out.frames.push([fid, [["?", "FRAME HILANG"]]]); continue; }
  const hits = [];
  for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
    const c = t.characters.trim();
    if (/Rp/.test(c)) hits.push([t.id, c]);
  }
  out.frames.push([f.name + " [" + fid + "]", hits]);
}
return out;
