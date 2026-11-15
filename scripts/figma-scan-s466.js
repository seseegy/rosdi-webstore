// Read-only QA scan s466: hitung kata Diamond/Diamonds/Garansi/Promo Kilat,
// node+teks frame E-Wallet Desktop (51:190), harga Genshin di frame Desktop.
// Tidak mengubah apa pun. Output ringkas agar < 48KB.
const countWord = (txt, word) => {
  const re = new RegExp("\\b" + word.replace(" ", "\\s+") + "\\b", "g");
  return (txt.match(re) || []).length;
};
const WORDS = ["Diamond", "Diamonds", "Garansi", "Promo Kilat"];
const frames = [];
for (const f of figma.currentPage.children) {
  const per = {};
  for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
    for (const w of WORDS) {
      const n = countWord(t.characters, w);
      if (n) per[w] = (per[w] || 0) + n;
    }
  }
  if (Object.keys(per).length) frames.push([f.name.slice(0, 70), f.id, per]);
}
const totals = {};
for (const w of WORDS) totals[w] = frames.reduce((a, f) => a + (f[2][w] || 0), 0);
// Frame E-Wallet Desktop 51:190
const em = figma.getNodeById("51:190");
let emoney = null;
if (em) {
  const all = em.findAll(() => true);
  const texts = em.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.slice(0, 60));
  emoney = { name: em.name, id: em.id, nodeCount: all.length + 1, textCount: texts.length, texts: texts.slice(0, 120) };
}
// Frame Genshin Desktop + Produk Game Desktop: semua teks Rp / nama item
const gi = [];
for (const f of figma.currentPage.children) {
  const isGiDesk = /genshin/i.test(f.name) && /desktop/i.test(f.name);
  const isProdDesk = /produk game/i.test(f.name) && /desktop/i.test(f.name);
  if (!isGiDesk && !isProdDesk) continue;
  const hits = [];
  for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
    const c = t.characters;
    if (/Rp/.test(c) || /Genesis|Welkin|Crystal/i.test(c)) hits.push(c.slice(0, 50));
  }
  gi.push([f.name.slice(0, 70), f.id, hits.slice(0, 80)]);
}
return { frameCount: figma.currentPage.children.length, totals, frames, emoney, genshin: gi };
