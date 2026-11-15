// Fase 2 B3 Tier 2 (perbaikan) — kumpulkan SEMUA target dulu (baca characters
// sekali), baru hapus. Jangan filter ulang allText setelah ada remove().
const out = {};
const allText = figma.root.findAllWithCriteria({ types: ["TEXT"] });
const groups = { hargaFinal: [], cekID: [] };
for (const t of allText) {
  if (t.characters === "Harga final, tanpa biaya lain") groups.hargaFinal.push(t);
  else if (t.characters === "Cek ID") groups.cekID.push(t);
}
for (const [label, hits] of Object.entries(groups)) {
  const frames = {};
  for (const t of hits) {
    let p = t.parent, f = "?";
    while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") { f = p.name; break; } p = p.parent; }
    frames[f] = (frames[f] || 0) + 1;
    t.remove();
  }
  out[label] = { removed: hits.length, perFrame: frames };
}
return out;
