// Probe read-only Siklus 134d: geometri kartu modal S&K mobile (10:2/10:105) +
// header seksi util di Beranda mobile (1:2) — persiapan update teks S&K +
// judul seksi.
const out = [];
for (const fid of ["10:2", "10:105", "1:2"]) {
  const f = await figma.getNodeByIdAsync(fid);
  const kids = f.children.map((c) => ({
    id: c.id, name: c.name, type: c.type,
    x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height),
  }));
  const veilIdx = kids.findIndex((k) => k.name === "Veil");
  const after = veilIdx >= 0 ? kids.slice(veilIdx) : [];
  const utilHead = kids.filter((k) => k.type === "TEXT" && (k.name || "").indexOf("Pulsa") === 0)
    .map((k) => ({ name: k.name, y: k.y, w: k.w, h: k.h }));
  // Semua teks yang mengandung "Pulsa, Data" di mana pun (findAll, nama boleh beda)
  const allUtil = f.findAll((n) => n.type === "TEXT" && (n.characters || "").indexOf("Pulsa, Data") === 0)
    .map((n) => ({ name: n.name, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height), chars: n.characters }));
  out.push({ id: fid, name: f.name, frameH: Math.round(f.height), veilIdx, modalNodes: after, utilHead, allUtil });
}
return out;
