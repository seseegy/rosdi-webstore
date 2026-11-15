// Samakan judul hero semua varian -> versi kode; samakan kapitalisasi CTA.
const frames = figma.currentPage.children.filter(n => n.type === "FRAME");
let h1 = 0, cta = 0; const leftovers = [];
for (const fr of frames) {
  for (const t of fr.findAll(n => n.type === "TEXT")) {
    if (t.characters === "Top Up Termurah, Proses Instan") { t.characters = "Top up, harga final sejak awal"; h1++; }
    if (t.characters === "Mulai Top Up") { t.characters = "Mulai top up"; cta++; }
    if (/ermurah/i.test(t.characters)) leftovers.push(fr.id + ": " + t.characters);
  }
}
return { h1, cta, leftovers };
