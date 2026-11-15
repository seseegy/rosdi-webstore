// Fase 2 B3 Tier 1 — penggantian teks Figma → kode (11 pola, ~206 node).
// Aturan auto-resize: bila node NONE, set WIDTH_AND_HEIGHT (satu baris) atau
// HEIGHT (multi-baris) sebelum ganti teks agar teks baru yang lebih panjang
// tidak terpotong. Kembalikan hitungan + contoh tinggi lama/baru.
const out = {};
async function setText(t, chars) {
  try { await figma.loadFontAsync(t.fontName); }
  catch (e) {
    const segs = t.getStyledTextSegments(["fontName"]);
    for (const s of segs) await figma.loadFontAsync(s.fontName);
  }
  const single = !chars.includes("\n");
  if (t.textAutoResize === "NONE") t.textAutoResize = single ? "WIDTH_AND_HEIGHT" : "HEIGHT";
  const before = { h: Math.round(t.height), w: Math.round(t.width) };
  t.characters = chars;
  return { before, after: { h: Math.round(t.height), w: Math.round(t.width) } };
}
const allText = figma.root.findAllWithCriteria({ types: ["TEXT"] });
async function replaceExact(label, oldChars, newChars) {
  const hits = allText.filter((t) => t.characters === oldChars);
  const samples = [];
  for (const t of hits) samples.push(await setText(t, newChars));
  out[label] = { count: hits.length, samples: samples.slice(0, 3) };
}
async function replaceSub(label, oldSub, newSub) {
  const hits = allText.filter((t) => t.characters.includes(oldSub));
  const samples = [];
  for (const t of hits) samples.push(await setText(t, t.characters.split(oldSub).join(newSub)));
  out[label] = { count: hits.length, samples: samples.slice(0, 3) };
}
await replaceExact("lacak", "Lacak", "Cek");
await replaceExact("metodeQRIS", "Metode: QRIS", "Pembayaran: QRIS");
await replaceExact("promo", "Punya kode promo? Coba ROSDI10", "Punya kode promo? Coba ROSDI10 / GAMER5");
await replaceExact("genshin1090", "1.090 Genesis Crystal", "1090 Genesis Crystal");
await replaceExact("genshin2240", "2.240 Genesis Crystal", "2240 Genesis Crystal");
await replaceExact("genshin3880", "3.880 Genesis Crystal", "3880 Genesis Crystal");
await replaceExact("totalDibayar", "Total dibayar", "Total");
await replaceExact("biayaLayanan", "Biaya layanan", "Biaya pembayaran");
await replaceExact("emailBukti", "Email untuk bukti pembayaran (opsional)", "Email (opsional)");
await replaceSub("tagihanPascabayar", "token PLN, dan e-wallet", "token PLN, tagihan pascabayar, dan e-wallet");
await replaceSub("saldoKembali", "Saldo kembali", "Uang kembali");
await replaceExact("tokenKamu", "Nomor token PLN kamu", "Nomor token PLN");
await replaceExact("isiSaldo", "Isi Saldo E-Wallet", "Saldo E-Wallet");
return out;
