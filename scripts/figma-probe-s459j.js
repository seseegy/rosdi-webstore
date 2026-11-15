// Probe Figma s459j (read-only): semua node bernama "Nom Token ..." di 30:2
// dan "Nom Pulsa ..." di 28:2 — lebar kartu nominal tanpa peduli induknya.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const cari = (fid, re) => {
  const fr = F(fid);
  return fr.findAll((n) => re.test(n.name)).map((n) => ({ nama: n.name, tipe: n.type, ...box(n) }));
};
return {
  e59_pln: { frame: F("30:2").name, kartu: cari("30:2", /^Nom Token/) },
  e58_pulsa: { frame: F("28:2").name, kartu: cari("28:2", /^Nom Pulsa/) },
};
