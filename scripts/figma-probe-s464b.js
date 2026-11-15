// Probe Figma s464 E55b/E59b/E60b (read-only): hitung frasa persis yang tanpa padanan kode.
const frameOf = (t) => {
  let p = t.parent;
  while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") return p.name + " (" + p.id + ")"; p = p.parent; }
  return "?";
};
const out = {};
const countPhrase = (phrase) => {
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes(phrase));
  const perFrame = {};
  for (const t of all) { const f = frameOf(t); perFrame[f] = (perFrame[f] || 0) + 1; }
  return { frasa: phrase, jumlahNode: all.length, jumlahFrame: Object.keys(perFrame).length, frame: Object.entries(perFrame).sort((a, b) => b[1] - a[1]).slice(0, 12) };
};
out.biaya_layanan = countPhrase("Biaya layanan");
out.total_dibayar = countPhrase("Total dibayar");
out.harga_final_tanpa = countPhrase("Harga final, tanpa biaya lain");
out.pulsa_dan_data = countPhrase("Pulsa & Data");
// Apakah teks "Beranda" di frame produk adalah nav header atau crumb? Cek node "Beranda" di frame Pulsa Telkomsel Desktop.
const fr = figma.getNodeById("28:2");
if (fr) {
  out.beranda_28_2 = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes("Beranda")).map((t) => ({ teks: t.characters, x: Math.round(t.absoluteBoundingBox ? t.absoluteBoundingBox.x : 0), y: Math.round(t.absoluteBoundingBox ? t.absoluteBoundingBox.y : 0) }));
} else out.beranda_28_2 = { error: "frame 28:2 tidak ditemukan" };
return out;
