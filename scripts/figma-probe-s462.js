// Probe Figma s462 ide 53-64 (read-only).
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const frameOf = (t) => {
  let p = t.parent;
  while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") return p.name + " (" + p.id + ")"; p = p.parent; }
  return "?";
};
const findFrame = (re) => {
  const hits = figma.root.findAll((n) => n.type === "FRAME" && re.test(n.name) && n.parent && n.parent.type === "PAGE");
  return hits[0] || null;
};
const out = {};

// E54/E55: gap antar-langkah di Produk Game Desktop (26:2) vs Token PLN Desktop (30:2)
const stepInfo = (fid) => {
  const fr = F(fid);
  if (!fr) return { error: "frame tidak ditemukan: " + fid };
  const steps = fr.findAll((n) => /^Step\dCard$/.test(n.name))
    .map((n) => ({ n: n.name, ...box(n) })).sort((a, b) => a.y - b.y);
  const gaps = [];
  for (let i = 0; i + 1 < steps.length; i++) gaps.push({ dari: steps[i].n, ke: steps[i + 1].n, gap: r1(steps[i + 1].y - (steps[i].y + steps[i].h)) });
  return { frame: fr.name, langkah: steps.length, steps, gaps };
};
out.e54_55_game = stepInfo("26:2");
out.e54_55_pln = stepInfo("30:2");

// E56/E57/E58: lebar baris metode pembayaran (13 metode) + lebar kartu langkah kiri
const rowW = (fr, nameRe) => {
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => nameRe.test(x.characters.trim()));
  if (!t) return { name: null };
  let a = t.parent;
  while (a && a !== fr) {
    const b = a.absoluteBoundingBox;
    if (b.height >= 50 && b.height <= 80 && b.width > 300) return { name: t.characters.trim(), w: r1(b.width), h: r1(b.height) };
    a = a.parent;
  }
  return { name: t.characters.trim(), w: null };
};
const payRows = (fr) => {
  if (!fr) return { error: "frame tidak ditemukan" };
  const names = ["QRIS", "GoPay", "DANA", "OVO", "ShopeePay", "BCA Virtual Account", "Mandiri Virtual Account", "BRI Virtual Account", "Danamon Virtual Account", "Alfamart", "Indomaret", "Pulsa Telkomsel", "Pulsa XL"];
  const rows = names.map((n) => rowW(fr, new RegExp("^" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$")));
  const steps = fr.findAll((n) => /^Step\dCard$/.test(n.name)).map((n) => ({ n: n.name, ...box(n) }));
  return { frame: fr.name + " (" + fr.id + ")", rows, lebarKartuLangkah: steps };
};
out.e56_dana = payRows(findFrame(/saldo dana.*desktop/i) || F("31:2"));
out.e57_pln = payRows(F("30:2"));
out.e58_voucher = payRows(findFrame(/voucher google play.*desktop/i));

// E53/E59/E60/E61/E62: hitung kata di seluruh file
const countWord = (word) => {
  const reSub = new RegExp(word, "g");
  const reWord = new RegExp("\\b" + word + "\\b", "g");
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes(word));
  const perFrame = {};
  let totalSub = 0, totalWord = 0;
  for (const t of all) {
    totalSub += (t.characters.match(reSub) || []).length;
    totalWord += (t.characters.match(reWord) || []).length;
    const f = frameOf(t);
    perFrame[f] = (perFrame[f] || 0) + (t.characters.match(reSub) || []).length;
  }
  return { kata: word, jumlahNode: all.length, totalSubstring: totalSub, totalKataUtuh: totalWord, perFrame, teksUnik: [...new Set(all.map((t) => t.characters.trim()))].slice(0, 40) };
};
out.e53_bayar = countWord("Bayar");
out.e59_gagal = countWord("Gagal");
out.e60_sukses = countWord("Sukses");
out.e61_cek = countWord("Cek");
out.e62_beli = countWord("Beli");
// pelengkap: "bayar" huruf kecil (untuk membedakan dari "Pembayaran")
out.e53b_bayar_kecil = countWord("bayar");

// E63: harga paket data by.U di frame Paket Data mobile (41:2)
{
  const fr = F("41:2");
  const all = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim());
  out.e63_byu_mobile = {
    frame: fr.name + " (" + fr.id + ")",
    itemByu: all.filter((t) => /^Kuota by\.U/.test(t) || /^Kuota Malam by\.U/.test(t) || /^Kuota Lokal by\.U/.test(t) || /^Unlimited by\.U/.test(t)),
    hargaRp: all.filter((t) => /^Rp[\d.]+$/.test(t)),
    semuaTeksByu: all.filter((t) => /by\.U/i.test(t)),
  };
}

// E64: hitung node/teks Beranda — Desktop (20:2 Light / 21:2 Dark)
const frameDump = (fid) => {
  const fr = F(fid);
  if (!fr) return { error: "frame tidak ditemukan: " + fid };
  const all = fr.findAll(() => true);
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
  return { frame: fr.name + " (" + fr.id + ")", jumlahNode: all.length, jumlahNodeTeks: texts.length, teks: texts };
};
out.e64_beranda_light = frameDump("20:2");
out.e64_beranda_dark = frameDump("21:2");

// Daftar frame Desktop (bila frame DANA/Voucher tidak ketemu by name)
out.daftarFrameDesktop = figma.root.findAll((n) => n.type === "FRAME" && /desktop/i.test(n.name) && n.parent && n.parent.type === "PAGE").map((n) => n.name + " (" + n.id + ")");

return out;
