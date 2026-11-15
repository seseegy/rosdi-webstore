// Probe Figma s462c (read-only): daftar node "Pay <metode>" (RECTANGLE) di 3 frame.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const out = {};
const rows = (fid) => {
  const fr = F(fid);
  if (!fr) return { error: "frame tidak ditemukan: " + fid };
  const all = fr.findAll((n) => n.type === "RECTANGLE" && /^Pay /.test(n.name))
    .map((n) => ({ nama: n.name, ...box(n) }))
    .sort((a, b) => a.y - b.y);
  return { frame: fr.name + " (" + fr.id + ")", jumlah: all.length, baris: all };
};
out.e56_dana = rows("31:2");
out.e57_pln = rows("30:2");
out.e58_voucher = rows("33:2");
return out;
