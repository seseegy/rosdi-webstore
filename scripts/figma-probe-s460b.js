// Probe Figma s460b (read-only): per-frame "Promo", kotak teks nominal DANA +
// voucher GP (x/y/w sendiri), format teks voucher di 33:2, node kartu flash.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const topFrame = (t) => {
  let p = t, last = null;
  while (p) { if (p.type === "FRAME") last = p; p = p.parent; }
  return last ? last.name + " (" + last.id + ")" : "?";
};
const out = {};

// E53b: "Promo" per frame (walk-up ke FRAME teratas)
{
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Promo/.test(t.characters));
  const perFrame = {};
  for (const t of all) { const f = topFrame(t); perFrame[f] = (perFrame[f] || 0) + 1; }
  out.e53b = { jumlah: all.length, perFrame };
  // varian lain kata promo (kecil/huruf lain)?
  out.e53b.varianLain = figma.root.findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => /promo/i.test(t.characters) && !/Kode Promo/.test(t.characters))
    .map((t) => t.characters);
}

// E58b: kotak teks "Saldo N" sendiri di DANA Desktop 31:2 (x/y/w utk infer kolom)
{
  const fr = F("31:2");
  const hits = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Saldo [\d.]+$/.test(t.characters.trim()));
  out.e58b = hits.map((t) => ({ teks: t.characters.trim(), ...box(t) }));
  // harga di sampingnya? semua teks Rp di frame
  out.e58b.hargaRp = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Rp[\d.]+$/.test(t.characters.trim())).map((t) => ({ teks: t.characters.trim(), ...box(t) }));
}

// E59b: format teks voucher di Voucher Google Play Desktop 33:2
{
  const fr = F("33:2");
  const all = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => ({ teks: t.characters, ...box(t) }));
  out.e59b = {
    frame: fr.name,
    itemTexts: all.filter((t) => /Google Play|IDR|Voucher|Steam|PlayStation/.test(t.teks)),
    semuaTeksRp: all.filter((t) => /^Rp[\d.]+$/.test(t.teks.trim())),
  };
}

// E64b: node kartu flash — cari child bernama /flash|card/i di kedua Beranda
for (const [key, fid] of Object.entries({ desktop: "20:2", mobile: "1:2" })) {
  const fr = F(fid);
  const cands = fr.findAll((n) => /flash|card/i.test(n.name)).map((n) => ({ nama: n.name, tipe: n.type, ...box(n) }));
  const itemTxt = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Weekly Diamond Pass|70 Diamonds/.test(t.characters)).map((t) => ({ teks: t.characters.trim(), ...box(t) }));
  out["e64b_" + key] = { frame: fr.name, kandidatKartu: cands.slice(0, 20), itemTxt };
}

// E61b/E62b: duplikat Rp51.907 (Pulsa 2:2) & Rp52.500 (PLN 2:116) — node mana?
for (const [key, fid, re] of [["pulsaDup", "2:2", /^Rp51\.907$/], ["plnDup", "2:116", /^Rp52\.500$/]]) {
  const fr = F(fid);
  const hits = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => re.test(t.characters.trim()));
  out[key] = hits.map((t) => ({ teks: t.characters.trim(), ...box(t), parent: t.parent ? t.parent.name : null }));
}
return out;
