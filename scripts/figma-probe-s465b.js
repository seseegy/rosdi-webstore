// Probe Figma s465b E54-60 (read-only): frame Beranda Pencarian mlbb, harga game mobile, lebar kartu/baris mobile.
const out = {};
const allFrames = figma.root.findAllWithCriteria({ types: ["FRAME"] }).filter((f) => f.parent && f.parent.type === "PAGE");
const byName = (re) => allFrames.find((f) => re.test(f.name));
const countNodes = (n) => { let c = 1; if (n.children) for (const ch of n.children) c += countNodes(ch); return c; };
// --- E54: frame Beranda Pencarian mlbb (tanda kutip keriting di nama) ---
const mlbb = byName(/Pencarian.*mlbb/i);
if (mlbb) {
  const texts = mlbb.findAllWithCriteria({ types: ["TEXT"] });
  out.frameMlbb = { nama: mlbb.name, id: mlbb.id, lebar: mlbb.width, tinggi: mlbb.height, jumlahNodeTotal: countNodes(mlbb), jumlahNodeTeks: texts.length, teks: texts.map((t) => t.characters) };
} else out.frameMlbb = null;
// --- E55-58: harga nominal di frame mobile tiap game (Light) ---
const rpTexts = (frame) => frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Rp[\d.]+/.test(t.characters)).map((t) => t.characters.trim());
const itemNames = (frame) => frame.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter((s) => /CP|Wild Cores|Delta Coins|Voucher$|Voucher /.test(s));
const gameFrames = {
  codm: byName(/Call of Duty: Mobile — Light/),
  wildRift: byName(/League of Legends: Wild Rift — Light/),
  deltaForce: byName(/Delta Force — Light/),
  aov: byName(/Arena of Valor — Light/),
};
for (const [k, f] of Object.entries(gameFrames)) {
  if (!f) { out[k] = null; continue; }
  out[k] = { nama: f.name, id: f.id, lebar: f.width, hargaRp: rpTexts(f), namaItem: [...new Set(itemNames(f))] };
}
// --- E59-60: lebar kartu nominal + baris metode di frame Produk Game mobile ---
const pg = byName(/Produk Game \(6 Langkah\) — Light/);
if (pg) {
  const cardWidths = (frame) => {
    const res = [];
    const rps = frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Rp[\d.]+/.test(t.characters));
    for (const t of rps) {
      let p = t.parent;
      while (p && p !== frame) {
        if (p.width && p.width > 60 && p.width < 390 && p.height > 40) { res.push(Math.round(p.width * 10) / 10); break; }
        p = p.parent;
      }
    }
    return res;
  };
  const payWidths = (frame) => {
    const res = [];
    const names = frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^(QRIS|GoPay|DANA|OVO|ShopeePay|BCA Virtual Account|Mandiri Virtual Account|BRI Virtual Account|Alfamart|Indomaret|Pulsa Telkomsel|Pulsa XL)$/.test(t.characters.trim()));
    for (const t of names) {
      let p = t.parent;
      while (p && p !== frame) {
        if (p.width && p.width > 200 && p.width < 390 && p.height > 30) { res.push({ metode: t.characters.trim(), lebar: Math.round(p.width * 10) / 10 }); break; }
        p = p.parent;
      }
    }
    return res;
  };
  out.produkGameMobile = { nama: pg.name, id: pg.id, lebar: pg.width, lebarKartuNominal: cardWidths(pg), lebarBarisMetode: payWidths(pg) };
} else out.produkGameMobile = null;
return out;
