// Probe susulan s461e (read-only): teks unik mengandung "Saldo" di frame
// Produk Game Desktop 26:2 dan Beranda Light 1:2 (atribusi ide 59).
const F = (id) => figma.getNodeById(id);
const out = {};
for (const [key, fid] of Object.entries({ gameDesktop: "26:2", beranda: "1:2" })) {
  const fr = F(fid);
  const hits = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes("Saldo"));
  const perTeks = {};
  for (const t of hits) perTeks[t.characters] = (perTeks[t.characters] || 0) + 1;
  out[key] = { frame: fr.name, jumlah: hits.length, perTeks };
}
return out;
