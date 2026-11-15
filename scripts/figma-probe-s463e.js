// Probe Figma s463-E: harga FF (111:2) + PUBG (114:2) mobile — read-only.
const F = (id) => figma.getNodeById(id);
const out = {};
for (const fid of ["111:2", "114:2"]) {
  const fr = F(fid);
  if (!fr) { out[fid] = { error: "tidak ditemukan" }; continue; }
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
  out[fid] = { frame: fr.name + " (" + fr.id + ")", jumlahTeks: texts.length, teks: texts };
}
return out;
