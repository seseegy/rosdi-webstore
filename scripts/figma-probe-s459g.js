// Probe Figma s459g (read-only, ditulis untuk audit s459): E59 lebar kartu
// nominal PLN Desktop, E60 Mulai Rp Steam di frame Voucher mobile, E61 Mulai
// Rp GoPay di frame E-Wallet mobile, E62 harga by.U di Paket Data mobile,
// E63 isi frame Sukses Desktop.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const out = {};
const top = figma.root.children.filter((c) => c.type === "FRAME");
const mobile = (f) => { const b = f.absoluteBoundingBox; return b && Math.round(b.width) === 390; };

// E59: kartu nominal Token PLN Desktop (30:2) — rect "Nom ..." di Step2Card
{
  const fr = F("30:2");
  const step2 = fr.findAll((n) => n.name === "Step2Card")[0];
  const cards = step2 && "findAll" in step2
    ? step2.findAll((n) => n.type === "RECTANGLE" && /^Nom /.test(n.name)).map((n) => ({ nama: n.name, ...box(n) }))
    : [];
  out.e59 = { frame: fr ? fr.name : null, kartuNominal: cards };
}
// E60 + E61: semua frame mobile (390) bernama Voucher / E-Wallet — teks "Mulai Rp"
{
  const ringkas = (fr) => ({
    frame: fr.name, id: fr.id, y: r1(fr.absoluteBoundingBox.y),
    mulaiRp: fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Mulai Rp/.test(t.characters.trim())).map((t) => t.characters.trim()),
    namaProduk: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter((s) => /Steam|Google Play|PlayStation|GoPay|OVO|DANA|ShopeePay|Saldo/.test(s)),
  });
  out.e60_frameVoucherMobile = top.filter((f) => mobile(f) && /voucher/i.test(f.name)).map(ringkas);
  out.e61_frameEwalletMobile = top.filter((f) => mobile(f) && /e-?wallet/i.test(f.name)).map(ringkas);
}
// E62: frame Paket Data mobile yang memuat by.U (nama mengandung by.U, atau
// frame Paket Data mobile mana pun — ambil teks nama+Rp)
{
  const frs = top.filter((f) => mobile(f) && /paket data/i.test(f.name));
  out.e62_paketDataMobile = frs.map((fr) => ({
    frame: fr.name, id: fr.id, y: r1(fr.absoluteBoundingBox.y),
    teks: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()),
  }));
  const byu = top.filter((f) => /by\.?u/i.test(f.name));
  out.e62_frameByu = byu.map((fr) => ({ frame: fr.name, id: fr.id, lebar: r1(fr.absoluteBoundingBox.width), y: r1(fr.absoluteBoundingBox.y) }));
}
// E63: Sukses Desktop 36:166 (Light) / 36:244 (Dark) — hitung node + semua teks
{
  const hitung = (fid) => {
    const fr = F(fid);
    if (!fr) return { id: fid, ada: false };
    if (!("findAll" in fr)) return { id: fid, ada: true, frame: fr.name, tipe: fr.type, totalDescendants: 0, byType: { [fr.type]: 1 }, teks: fr.type === "TEXT" ? [fr.characters] : [] };
    const semua = fr.findAll(() => true);
    const byType = {};
    for (const n of semua) byType[n.type] = (byType[n.type] || 0) + 1;
    return { id: fid, ada: true, frame: fr.name, totalDescendants: semua.length, byType, teks: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters) };
  };
  out.e63_light = hitung("36:166");
  out.e63_dark = hitung("36:244");
}
return out;
