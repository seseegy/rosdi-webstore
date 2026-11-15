// Fix s433 ide 15 (Figma): tombol "Lacak" -> "Cek" di frame Cek Transaksi
// Light (3:236) + Dark (3:265) agar selaras dengan judul halaman & kode.
// Hanya node teks yang karakternya persis "Lacak" (tombol); subjudul
// "Lacak status pesananmu" tidak disentuh.
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;
const out = [];
for (const fid of ["3:236", "3:265"]) {
  const f = byId[fid];
  if (!f) { out.push({ frame: fid, error: "FRAME HILANG" }); continue; }
  const hits = f.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters === "Lacak");
  for (const t of hits) {
    t.characters = "Cek";
    out.push({ frame: f.name, id: t.id, before: "Lacak", after: t.characters });
  }
  if (hits.length === 0) out.push({ frame: f.name, error: "node 'Lacak' tidak ketemu" });
}
return out;
