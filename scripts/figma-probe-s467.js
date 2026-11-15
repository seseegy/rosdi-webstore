// Probe Figma s467 E46-60 (read-only): hitung kata + frame Voucher Desktop + harga HoK/PUBG Desktop + Steam mobile.
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
for (const w of ["Crystal", "Weekly", "Kuota", "Internet", "Listrik", "Tagihan", "Kode", "Bulan", "Hari", "Flash", "Instan"]) out["kata_" + w] = countWord(w);

const allFrames = figma.root.findAllWithCriteria({ types: ["FRAME"] }).filter((f) => f.parent && f.parent.type === "PAGE");
out.discovery = {
  totalFrameAtas: allFrames.length,
  voucher: allFrames.filter((f) => /Voucher/i.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
  produkGame: allFrames.filter((f) => /^Produk Game/i.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
  steam: allFrames.filter((f) => /Steam/i.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
  pubg: allFrames.filter((f) => /PUBG/i.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
  hok: allFrames.filter((f) => /Honor of Kings|HoK/i.test(f.name)).map((f) => f.name + " (" + f.id + ") w=" + f.width),
};
const countNodes = (n) => { let c = 1; if (n.children) for (const ch of n.children) c += countNodes(ch); return c; };
const frameTexts = (f) => {
  if (!f) return null;
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  return { nama: f.name, id: f.id, lebar: f.width, tinggi: f.height, jumlahNodeTotal: countNodes(f), jumlahNodeTeks: texts.length, teks: texts.map((t) => t.characters) };
};
// E57: frame "Voucher — Desktop" (cari nama mengandung Voucher + Desktop)
const voucherDesktop = allFrames.find((f) => /Voucher/i.test(f.name) && /Desktop/i.test(f.name));
out.frameVoucherDesktop = frameTexts(voucherDesktop);
// E58: frame Produk Game Desktop yang memuat HoK — cari frame Produk Game Desktop lalu cek teksnya mengandung "Honor of Kings"
const produkDesktop = allFrames.filter((f) => /^Produk Game/i.test(f.name) && /Desktop/i.test(f.name));
out.frameProdukDesktop = produkDesktop.map((f) => f.name + " (" + f.id + ") w=" + f.width);
let hokFrame = null, pubgFrame = null;
for (const f of produkDesktop) {
  const t = f.findAllWithCriteria({ types: ["TEXT"] }).map((x) => x.characters).join(" | ");
  if (/Honor of Kings/.test(t)) hokFrame = f;
  if (/PUBG Mobile/.test(t)) pubgFrame = f;
}
out.frameHoKDesktop = frameTexts(hokFrame);
out.framePUBGDesktop = frameTexts(pubgFrame);
// E60: frame Voucher mobile yang memuat Steam Wallet
const voucherMobile = allFrames.filter((f) => /Voucher/i.test(f.name) && !/Desktop/i.test(f.name));
out.frameVoucherMobile = voucherMobile.map((f) => f.name + " (" + f.id + ") w=" + f.width);
let steamFrame = null;
for (const f of voucherMobile) {
  const t = f.findAllWithCriteria({ types: ["TEXT"] }).map((x) => x.characters).join(" | ");
  if (/Steam Wallet/.test(t)) { steamFrame = f; break; }
}
out.frameSteamMobile = frameTexts(steamFrame);
return out;
