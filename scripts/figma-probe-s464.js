// Probe Figma s464 E55/E58-E61 (read-only, ringkas): hitung kata Beranda/Pulsa/Total/Biaya/Harga.
const r1 = (n) => Math.round(n * 10) / 10;
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
  const top = Object.entries(perFrame).sort((a, b) => b[1] - a[1]).slice(0, 15);
  return { kata: word, jumlahNode: all.length, totalSubstring: totalSub, totalKataUtuh: totalWord, jumlahFrame: Object.keys(perFrame).length, topFrame: top, teksUnik: [...new Set(all.map((t) => t.characters.trim()))].slice(0, 15) };
};
out.beranda = countWord("Beranda");
out.pulsa = countWord("Pulsa");
out.total = countWord("Total");
out.biaya = countWord("Biaya");
out.harga = countWord("Harga");
return out;
