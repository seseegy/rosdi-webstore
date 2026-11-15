// Probe Figma s463-A: hitung kata E56-E63 + I100 (read-only, ringkas).
const frameOf = (t) => {
  let p = t.parent;
  while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") return p.name + " (" + p.id + ")"; p = p.parent; }
  return "?";
};
const out = {};
const countWord = (word) => {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reSub = new RegExp(esc, "g");
  const reWord = new RegExp("\\b" + esc + "\\b", "g");
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes(word));
  const perFrame = {};
  let totalSub = 0, totalWord = 0;
  for (const t of all) {
    totalSub += (t.characters.match(reSub) || []).length;
    totalWord += (t.characters.match(reWord) || []).length;
    const f = frameOf(t);
    perFrame[f] = (perFrame[f] || 0) + (t.characters.match(reSub) || []).length;
  }
  return { kata: word, jumlahNode: all.length, totalSubstring: totalSub, totalKataUtuh: totalWord, perFrame, teksUnik: [...new Set(all.map((t) => t.characters.trim()))].slice(0, 12) };
};
out.e56_masuk = countWord("Masuk");
out.e57_keluar = countWord("Keluar");
out.e58_tutup = countWord("Tutup");
out.e59_lacak = countWord("Lacak");
out.e60_salin = countWord("Salin");
out.e61_kembali = countWord("Kembali");
out.e62_simpan = countWord("Simpan");
out.e63_hapus = countWord("Hapus");
out.i100_gopay_salah = countWord("Gopay");
out.i100_dana_salah = countWord("Dana");
out.i100_shopeepay_salah = countWord("Shopeepay");
out.i100_gopay_benar = countWord("GoPay");
out.i100_dana_benar = countWord("DANA");
out.i100_ovo_benar = countWord("OVO");
out.i100_shopeepay_benar = countWord("ShopeePay");
return out;
