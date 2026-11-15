// Probe Figma s465 E46-60 (read-only): hitung kata + discovery frame game + frame Beranda Pencarian mlbb.
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
  const top = Object.entries(perFrame).sort((a, b) => b[1] - a[1]).slice(0, 20);
  return { kata: word, jumlahNode: all.length, totalSubstring: totalSub, totalKataUtuh: totalWord, jumlahFrame: Object.keys(perFrame).length, topFrame: top, teksUnik: [...new Set(all.map((t) => t.characters.trim()))].slice(0, 20) };
};
for (const w of ["Metode", "Transaksi", "Pesanan", "Berhasil", "Diproses", "Server", "Token", "Nomor"]) out["kata_" + w] = countWord(w);
// discovery: semua frame tingkat atas yang namanya mengandung nama game / mlbb
const allFrames = figma.root.findAllWithCriteria({ types: ["FRAME"] }).filter((f) => f.parent && f.parent.type === "PAGE");
out.discovery = {
  totalFrameAtas: allFrames.length,
  codm: allFrames.filter((f) => /Call of Duty|CODM/i.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
  wildRift: allFrames.filter((f) => /Wild Rift/i.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
  deltaForce: allFrames.filter((f) => /Delta Force/i.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
  aov: allFrames.filter((f) => /Arena of Valor/i.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
  mlbbSearch: allFrames.filter((f) => /Pencarian/i.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
  produkGame: allFrames.filter((f) => /^Produk Game/.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
};
// frame "Beranda — Pencarian 'mlbb'": hitung node + teks
const mlbb = allFrames.find((f) => /Pencarian 'mlbb'/i.test(f.name) || /Pencarian "mlbb"/i.test(f.name));
if (mlbb) {
  const texts = mlbb.findAllWithCriteria({ types: ["TEXT"] });
  const countNodes = (n) => { let c = 1; if (n.children) for (const ch of n.children) c += countNodes(ch); return c; };
  out.frameMlbb = { nama: mlbb.name, id: mlbb.id, lebar: mlbb.width, tinggi: mlbb.height, jumlahNodeTotal: countNodes(mlbb), jumlahNodeTeks: texts.length, teks: texts.map((t) => t.characters) };
} else {
  out.frameMlbb = null;
}
// "Token prabayar" — ada di Figma? (ide 70: tidak ada di src/)
const tp = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes("Token prabayar"));
out.tokenPrabayar = { jumlahNode: tp.length, frame: tp.map((t) => frameOf(t)), teks: [...new Set(tp.map((t) => t.characters.trim()))] };
const kd = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes("Kode digital"));
out.kodeDigital = { jumlahNode: kd.length, frame: [...new Set(kd.map((t) => frameOf(t)))].slice(0, 10), teks: [...new Set(kd.map((t) => t.characters.trim()))].slice(0, 10) };
return out;
