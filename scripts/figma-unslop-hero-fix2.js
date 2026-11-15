// Judul hero mobile = dua simpul teks terpisah. Ganti per baris.
const frames = figma.currentPage.children.filter(n => n.type === "FRAME");
let fixed = 0; const leftovers = [];
for (const fr of frames) {
  const texts = fr.findAll(n => n.type === "TEXT");
  const l1 = texts.find(t => t.characters === "Top Up Termurah,");
  if (!l1) continue;
  const l2 = texts.find(t => t.characters === "Proses Instan" && t.y > l1.y && t.y < l1.y + 90 && Math.abs(t.x - l1.x) < 6);
  l1.characters = "Top up, harga final";
  if (l2) l2.characters = "sejak awal";
  fixed++;
}
for (const fr of frames) for (const t of fr.findAll(n => n.type === "TEXT")) if (/ermurah/i.test(t.characters)) leftovers.push(fr.id + ": " + t.characters);
return { fixed, leftovers };
