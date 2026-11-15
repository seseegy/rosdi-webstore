// Fix Figma s452 (ide 50 + 52). Mengubah Figma saja, bukan kode.
// ide 50: teks CTA "Mulai top up" 12px -> 14px di 8 frame keluarga Beranda
//   (kode .btn = 14px di semua lebar; teks 72px -> ~84px, rect tombol 118px
//   masih muat: inset kiri 17px, kanan jadi 17px — simetris).
// ide 52: hapus rect latar chip countdown yang tersembunyi (visible=false)
//   di 4 frame Beranda utama — teks countdown-nya tetap tampil, kode pun
//   tidak punya latar chip; node tak terlihat ini hanya sisa.
const out = { cta: [], hiddenRemoved: {} };
const frames50 = ["1:2", "1:105", "15:2", "15:105", "10:2", "10:105", "13:2", "13:111"];
for (const id of frames50) {
  const fr = figma.getNodeById(id);
  if (!fr) { out.cta.push({ frame: id, err: "tidak ketemu" }); continue; }
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => x.characters.trim() === "Mulai top up");
  if (!t) { out.cta.push({ frame: fr.name, err: "teks tidak ketemu" }); continue; }
  const before = { size: t.fontSize, w: Math.round(t.width * 10) / 10, x: Math.round(t.x * 10) / 10, auto: t.textAutoResize };
  await figma.loadFontAsync(t.fontName);
  t.textAutoResize = "WIDTH_AND_HEIGHT";
  t.fontSize = 14;
  out.cta.push({ frame: fr.name, before, after: { size: t.fontSize, w: Math.round(t.width * 10) / 10, x: Math.round(t.x * 10) / 10 } });
}
for (const id of ["1:2", "1:105", "20:2", "21:2"]) {
  const fr = figma.getNodeById(id);
  const hidden = fr.findAll((n) => n.visible === false);
  const names = hidden.map((n) => n.name + " " + Math.round(n.width) + "x" + Math.round(n.height));
  for (const n of hidden) n.remove();
  out.hiddenRemoved[fr.name] = { removed: hidden.length, names };
}
return out;
