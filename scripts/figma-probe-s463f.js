// Probe Figma s463-F: node/teks frame Dark 26:281 + 30:241 — read-only.
const F = (id) => figma.getNodeById(id);
const out = {};
for (const fid of ["26:281", "30:241"]) {
  const fr = F(fid);
  if (!fr) { out[fid] = { error: "tidak ditemukan" }; continue; }
  let nodes = 0;
  const walk = (n) => { nodes++; if (n.children) n.children.forEach(walk); };
  walk(fr);
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
  out[fid] = { frame: fr.name + " (" + fr.id + ")", jumlahNode: nodes, jumlahTeks: texts.length, teks: texts };
}
return out;
