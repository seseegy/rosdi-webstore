// Follow-up s466 ide 40: teks lengkap footer di frame 51:190 (scan pertama
// memotong 60 karakter — tidak bisa membedakan ada/tidaknya "tagihan pascabayar").
const em = figma.getNodeById("51:190");
const out = [];
for (const t of em.findAllWithCriteria({ types: ["TEXT"] })) {
  const c = t.characters;
  if (/Toko top up|© 2026|Harga diperbarui/i.test(c)) out.push(c);
}
return { texts: out };
