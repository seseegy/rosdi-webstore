// Probe Figma s459i (read-only): E60 teks "Mulai Rp" frame Voucher mobile
// 3:118, E61 frame E-Wallet mobile 3:2, E59 semua turunan Step2Card PLN 30:2.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const out = {};
{
  const fr = F("3:118");
  out.e60 = { frame: fr.name, mulaiRp: fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Mulai Rp/.test(t.characters.trim())).map((t) => t.characters.trim()), semuaTeks: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()) };
}
{
  const fr = F("3:2");
  out.e61 = { frame: fr.name, mulaiRp: fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Mulai Rp/.test(t.characters.trim())).map((t) => t.characters.trim()), semuaTeks: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()) };
}
{
  const fr = F("30:2");
  const step2 = fr.findAll((n) => n.name === "Step2Card")[0];
  out.e59_turunanStep2 = step2 && "findAll" in step2
    ? step2.findAll(() => true).map((n) => ({ nama: n.name, tipe: n.type, ...box(n) }))
    : [];
}
return out;
