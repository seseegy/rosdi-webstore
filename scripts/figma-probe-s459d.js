// Probe Figma s459d (read-only): "Mulai Rp" di Beranda mobile 1:2 + harga Steam mobile 100:2.
const F = (id) => figma.getNodeById(id);
const r1 = (n) => Math.round(n * 10) / 10;
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const out = {};
// Beranda mobile: semua teks "Mulai Rp..." + teks kartu di sekitarnya (nama produk)
{
  const fr = F("1:2");
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] });
  const mulai = texts.filter((t) => /^Mulai Rp/.test(t.characters.trim()))
    .map((t) => ({ teks: t.characters.trim(), ...box(t) }));
  // nama kartu produk di beranda (teks tebal di sekitar y yang sama) — ambil semua teks unik pendek
  out.berandaMobile = { frame: fr.name, mulaiRp: mulai };
}
// Steam Wallet mobile 100:2: semua teks (nama + harga)
{
  const fr = F("100:2");
  out.steamMobile = { frame: fr.name, teks: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters) };
}
// GoPay: adakah frame produk GoPay? cari frame bernama GoPay di seluruh file
{
  const all = figma.root.findAll((n) => n.type === "FRAME" && /GoPay/i.test(n.name));
  out.frameGoPay = all.map((n) => ({ nama: n.name, id: n.id }));
}
return out;
