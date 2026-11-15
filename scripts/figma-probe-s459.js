// Probe Figma s459 ide 53-64 (read-only): hitung Terlaris, gap langkah desktop,
// lebar kartu nominal, harga Mulai Rp mobile, harga by.U, isi Sukses Desktop.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const texts = (frame) => frame.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
const findTexts = (frame, re) => frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => re.test(t.characters)).map((t) => t.characters);
const out = {};

// E53: hitung kata "Terlaris" di seluruh file + frame mana saja
{
  const hits = [];
  const allText = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.trim() === "Terlaris");
  for (const t of allText) {
    let p = t.parent, frameName = "?";
    while (p) { if (p.type === "FRAME" && /Desktop|Light|Dark/.test(p.name) && p.parent === figma.root) { frameName = p.name + " (" + p.id + ")"; break; } p = p.parent; }
    hits.push({ frame: frameName, chars: t.characters });
  }
  out.e53 = { jumlahTerlaris: hits.length, perFrame: hits };
}

// E54-57, E64 + pembanding: gap StepNCard di 5 frame desktop
const FRAMES = { game26: "26:2", tsel28: "28:2", pln30: "30:2", dana31: "31:2", gp33: "33:2" };
for (const [key, fid] of Object.entries(FRAMES)) {
  const fr = F(fid);
  const steps = fr.findAll((n) => /^Step\dCard$/.test(n.name))
    .map((n) => ({ n: n.name, ...box(n) }))
    .sort((a, b) => a.y - b.y);
  const gaps = [];
  for (let i = 0; i + 1 < steps.length; i++) {
    gaps.push({ dari: steps[i].n, ke: steps[i + 1].n, gap: r1(steps[i + 1].y - (steps[i].y + steps[i].h)) });
  }
  out[key] = { frame: fr.name, langkah: steps.length, steps, gaps };
}

// E58: kartu nominal Pulsa Telkomsel Desktop 28:2 — teks "Pulsa N" + kotak induk 2 tingkat
{
  const fr = F("28:2");
  const hits = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Pulsa [\d.]+$/.test(t.characters.trim()));
  out.e58 = hits.map((t) => {
    const p1 = t.parent, p2 = p1 ? p1.parent : null;
    return { teks: t.characters.trim(), kartu: p1 ? { nama: p1.name, ...box(p1) } : null, induk2: p2 ? { nama: p2.name, ...box(p2) } : null };
  });
}
// E59: kartu nominal Token PLN Desktop 30:2
{
  const fr = F("30:2");
  const hits = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Token [\d.]+$/.test(t.characters.trim()));
  out.e59 = hits.map((t) => {
    const p1 = t.parent, p2 = p1 ? p1.parent : null;
    return { teks: t.characters.trim(), kartu: p1 ? { nama: p1.name, ...box(p1) } : null, induk2: p2 ? { nama: p2.name, ...box(p2) } : null };
  });
}
// E60: "Mulai Rp" voucher Steam di frame Voucher mobile 3:118
{
  const fr = F("3:118");
  out.e60 = { frame: fr.name, mulaiRp: findTexts(fr, /Mulai Rp/), steam: findTexts(fr, /Steam/), steamWallet: texts(fr).filter((t) => /^Steam Wallet [\d.]+$/.test(t.trim())) };
}
// E61: "Mulai Rp" e-wallet GoPay di frame E-Wallet mobile 3:2
{
  const fr = F("3:2");
  out.e61 = { frame: fr.name, mulaiRp: findTexts(fr, /Mulai Rp/), gopay: findTexts(fr, /GoPay/), ewalletNames: texts(fr).filter((t) => /^(Saldo (DANA|GoPay|OVO|ShopeePay))$/.test(t.trim())) };
}
// E62: harga paket data by.U di frame Paket Data mobile 41:2
{
  const fr = F("41:2");
  out.e62 = { frame: fr.name, byu: findTexts(fr, /by\.U/i), kuotaByu: texts(fr).filter((t) => /^Kuota by\.U/.test(t.trim())), semuaPaket: texts(fr).filter((t) => /^(Internet|Kuota|Freedom|Xtra|Bronet|Happy|Unlimited|OMG|GamesMax)/.test(t.trim())) };
}
// E63: isi frame Sukses Desktop 36:166 / 36:244 vs halaman Sukses kode
for (const [key, fid] of Object.entries({ suksesLight: "36:166", suksesDark: "36:244" })) {
  const fr = F(fid);
  const all = fr.findAll();
  const t = texts(fr);
  out[key] = { frame: fr.name, jumlahNode: all.length, jumlahTeks: t.length, teks: t };
}
return out;
