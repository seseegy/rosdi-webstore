// Probe Figma s461 ide 53-64 (read-only).
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const frameOf = (t) => {
  let p = t.parent;
  while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") return p.name + " (" + p.id + ")"; p = p.parent; }
  return "?";
};
const out = {};

// E53-E57: StepNCard di Genshin Desktop 84:2, PLN Desktop 30:2, Produk Game Desktop 26:2
const stepInfo = (fid) => {
  const fr = F(fid);
  if (!fr) return { error: "frame tidak ditemukan: " + fid };
  const steps = fr.findAll((n) => /^Step\dCard$/.test(n.name))
    .map((n) => ({ n: n.name, ...box(n) })).sort((a, b) => a.y - b.y);
  const gaps = [];
  for (let i = 0; i + 1 < steps.length; i++) gaps.push({ dari: steps[i].n, ke: steps[i + 1].n, gap: r1(steps[i + 1].y - (steps[i].y + steps[i].h)) });
  return { frame: fr.name, langkah: steps.length, steps, gaps };
};
out.e53_57_genshin = stepInfo("84:2");
out.e55_56_pln = stepInfo("30:2");
out.e57_game = stepInfo("26:2");

// E54: kartu nominal Genshin Desktop 84:2 — teks item + kotak induk 2 tingkat
{
  const fr = F("84:2");
  const hits = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Genesis Crystal|Blessing/.test(t.characters));
  out.e54 = hits.map((t) => {
    const p1 = t.parent, p2 = p1 ? p1.parent : null;
    return { teks: t.characters.trim(), kartu: p1 ? { nama: p1.name, ...box(p1) } : null, induk2: p2 ? { nama: p2.name, ...box(p2) } : null };
  });
}

// E58-E60: hitung kata di seluruh file (node teks + total kemunculan), per frame
const countWord = (word) => {
  const re = new RegExp(word, "g");
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes(word));
  const perFrame = {};
  let total = 0;
  for (const t of all) {
    const n = (t.characters.match(re) || []).length;
    total += n;
    const f = frameOf(t);
    perFrame[f] = (perFrame[f] || 0) + n;
  }
  return { jumlahNode: all.length, totalKemunculan: total, perFrame, teksUnik: [...new Set(all.map((t) => t.characters))] };
};
out.e58_voucher = countWord("Voucher");
out.e59_saldo = countWord("Saldo");
out.e60_topup = countWord("Top Up");

// E61: harga nominal Genshin di frame mobile 6:2
{
  const fr = F("6:2");
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
  out.e61 = { frame: fr.name, item: texts.filter((t) => /Genesis Crystal|Blessing/.test(t)), hargaRp: texts.filter((t) => /^Rp[\d.]+$/.test(t.trim())), semuaTeks: texts };
}

// E62: harga nominal Google Play di frame Voucher mobile 3:118
{
  const fr = F("3:118");
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
  out.e62 = { frame: fr.name, item: texts.filter((t) => /^Saldo [\d.]+$/.test(t.trim())), hargaRp: texts.filter((t) => /^Rp[\d.]+$/.test(t.trim())), semuaTeks: texts };
}

// E63: baris metode pembayaran di Pulsa Telkomsel Desktop 28:2
{
  const fr = F("28:2");
  const step3 = fr.findAll((n) => n.name === "Step3Card")[0];
  const inStep3 = (n) => { let p = n.parent; while (p) { if (p === step3) return true; p = p.parent; } return false; };
  const rows = fr.findAll((n) => /pay/i.test(n.name) && inStep3(n)).map((n) => ({ nama: n.name, tipe: n.type, ...box(n) }));
  // fallback: semua anak langsung Step3Card (bila Step3Card punya children)
  const kids = (step3 && "children" in step3) ? step3.children.map((n) => ({ nama: n.name, tipe: n.type, ...box(n) })) : [];
  out.e63 = { frame: fr.name, step3: step3 ? box(step3) : null, rowsPay: rows, anakLangsung: kids };
}

// E64: warna tile kategori di Beranda Light 1:2
{
  const fr = F("1:2");
  const findTile = (label) => {
    const hits = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.trim() === label);
    if (!hits.length) return { label, ditemukan: false };
    const t = hits[0];
    // naik ke kartu: cari ancestor FRAME/COMPONENT yang memuat teks + tile
    let anc = t.parent;
    for (let i = 0; i < 4 && anc; i++) {
      const tile = ("findAll" in anc) ? anc.findAll((n) => /tile/i.test(n.name)) : [];
      if (tile.length) {
        const tn = tile[0];
        const fills = tn.fills && tn.fills.length ? tn.fills.filter((f) => f.type === "SOLID").map((f) => hex(f.color)) : [];
        return { label, ditemukan: true, tileNama: tn.name, ...box(tn), fills };
      }
      anc = anc.parent;
    }
    return { label, ditemukan: true, tileNama: null, catatan: "tidak ada node bernama Tile dalam 4 ancestor" };
  };
  out.e64 = ["Pulsa Reguler", "Paket Data", "Token PLN", "Tagihan Pascabayar", "Saldo DANA", "Saldo GoPay", "Saldo OVO", "Saldo ShopeePay", "Voucher Google Play", "Steam Wallet IDR", "PlayStation Network ID"].map(findTile);
}

return out;
