// Probe Figma s460 ide 53-64 (read-only): hitung "Promo", gap StepNCard di 5 frame
// desktop, lebar kartu nominal DANA + Google Play desktop, isi Cek Desktop,
// harga pulsa/PLN mobile, "Mulai Rp" sedunia, tinggi kartu flash Beranda.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const texts = (frame) => frame.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
const findTexts = (frame, re) => frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => re.test(t.characters)).map((t) => t.characters);
const frameOf = (t) => {
  let p = t.parent;
  while (p) { if (p.type === "FRAME" && p.parent === figma.root) return p.name + " (" + p.id + ")"; p = p.parent; }
  return "?";
};
const out = {};

// E53: kata "Promo" di seluruh file
{
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Promo/.test(t.characters));
  const perFrame = {};
  for (const t of all) { const f = frameOf(t); perFrame[f] = (perFrame[f] || 0) + 1; }
  out.e53 = { jumlahNodeTeksMengandungPromo: all.length, perFrame, teks: all.map((t) => t.characters) };
}

// E54-E57: gap StepNCard di 5 frame desktop (Light saja; Dark dicek s459 pola sama)
const FRAMES = { voucherGP: "33:2", dana: "31:2", tsel: "28:2", pln: "30:2", game: "26:2" };
for (const [key, fid] of Object.entries(FRAMES)) {
  const fr = F(fid);
  const steps = fr.findAll((n) => /^Step\dCard$/.test(n.name))
    .map((n) => ({ n: n.name, ...box(n) }))
    .sort((a, b) => a.y - b.y);
  const gaps = [];
  for (let i = 0; i + 1 < steps.length; i++) {
    gaps.push({ dari: steps[i].n, ke: steps[i + 1].n, gap: r1(steps[i + 1].y - (steps[i].y + steps[i].h)) });
  }
  out["steps_" + key] = { frame: fr.name, langkah: steps.length, steps, gaps };
}

// E58: kartu nominal Saldo DANA Desktop 31:2 — teks "Saldo N" + kotak induk 2 tingkat
{
  const fr = F("31:2");
  const hits = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Saldo [\d.]+$/.test(t.characters.trim()));
  out.e58 = hits.map((t) => {
    const p1 = t.parent, p2 = p1 ? p1.parent : null;
    return { teks: t.characters.trim(), kartu: p1 ? { nama: p1.name, ...box(p1) } : null, induk2: p2 ? { nama: p2.name, ...box(p2) } : null };
  });
}
// E59: kartu nominal Voucher Google Play Desktop 33:2 — teks "Google Play IDR N"
{
  const fr = F("33:2");
  const hits = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Google Play IDR [\d.]+$/.test(t.characters.trim()));
  out.e59 = hits.map((t) => {
    const p1 = t.parent, p2 = p1 ? p1.parent : null;
    return { teks: t.characters.trim(), kartu: p1 ? { nama: p1.name, ...box(p1) } : null, induk2: p2 ? { nama: p2.name, ...box(p2) } : null };
  });
  out.e59.semuaIDR = findTexts(fr, /IDR/);
}

// E60: isi frame Cek Transaksi Desktop 36:2 / 36:84
for (const [key, fid] of Object.entries({ cekLight: "36:2", cekDark: "36:84" })) {
  const fr = F(fid);
  const all = fr.findAll();
  out[key] = { frame: fr.name, jumlahNode: all.length, jumlahTeks: texts(fr).length, teks: texts(fr) };
}

// E61: harga 11 nominal pulsa Telkomsel di Pulsa mobile 2:2 / 2:59
for (const [key, fid] of Object.entries({ pulsaLight: "2:2", pulsaDark: "2:59" })) {
  const fr = F(fid);
  out[key] = { frame: fr.name, pulsa: texts(fr).filter((t) => /^Pulsa [\d.]+$/.test(t.trim())), hargaRp: texts(fr).filter((t) => /^Rp[\d.]+$/.test(t.trim())) };
}
// E62: harga 6 token PLN di Token PLN mobile 2:116 / 2:181
for (const [key, fid] of Object.entries({ plnLight: "2:116", plnDark: "2:181" })) {
  const fr = F(fid);
  out[key] = { frame: fr.name, token: texts(fr).filter((t) => /^Token [\d.]+$/.test(t.trim())), hargaRp: texts(fr).filter((t) => /^Rp[\d.]+$/.test(t.trim())) };
}

// E63: "Mulai Rp" di seluruh file + per frame
{
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Mulai Rp/.test(t.characters));
  const perFrame = {};
  for (const t of all) { const f = frameOf(t); (perFrame[f] = perFrame[f] || []).push(t.characters); }
  out.e63 = { jumlah: all.length, perFrame };
}

// E64: tinggi kartu flash di Beranda Desktop 20:2 vs Beranda mobile 1:2
for (const [key, fid] of Object.entries({ berandaDesktop: "20:2", berandaMobile: "1:2" })) {
  const fr = F(fid);
  const flashTexts = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Flash Sale/i.test(t.characters));
  // kartu flash = node FRAME/GROUP yang memuat teks nama item flash
  const itemTexts = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Weekly Diamond Pass|70 Diamonds/.test(t.characters));
  out["flash_" + key] = {
    frame: fr.name,
    flashSaleText: flashTexts.map((t) => t.characters),
    itemCards: itemTexts.map((t) => {
      const p1 = t.parent, p2 = p1 ? p1.parent : null;
      return { teks: t.characters.trim(), kartu: p1 ? { nama: p1.name, ...box(p1) } : null, induk2: p2 ? { nama: p2.name, ...box(p2) } : null };
    }),
  };
}
return out;
