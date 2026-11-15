// Probe Figma s464 E57b (read-only): isi teks frame Produk Game mobile 1:208 + 1:314.
const out = {};
const frameTexts = (fid) => {
  const fr = figma.getNodeById(fid);
  if (!fr) return { error: "frame tidak ditemukan: " + fid };
  let nodes = 0;
  const walk = (n) => { nodes++; if (n.children) n.children.forEach(walk); };
  walk(fr);
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
  return { frame: fr.name + " (" + fr.id + ")", jumlahNode: nodes, jumlahTeks: texts.length, teks: texts };
};
out.light = frameTexts("1:208");
out.dark = frameTexts("1:314");
// frame mobile lain yang memuat nama game HoK/Valorant/Roblox?
const hits = {};
for (const name of ["Honor of Kings", "Valorant", "Roblox"]) {
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes(name));
  const frames = {};
  for (const t of all) {
    let p = t.parent;
    while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") { frames[p.name + " (" + p.id + ")"] = (frames[p.name + " (" + p.id + ")"] || 0) + 1; break; } p = p.parent; }
  }
  hits[name] = { jumlahNode: all.length, frame: Object.entries(frames).sort((a, b) => b[1] - a[1]).slice(0, 8) };
}
out.hits = hits;
return out;
