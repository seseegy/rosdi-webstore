// Probe verifikasi Siklus 69 (read-only): sapuan seluruh file —
// (a) 0 teks "Populer" / "Lihat semua" tersisa; (b) hitung teks
// "Harga mulai dari, final di halaman produk" (harapan 18: 10 mobile +
// 8 desktop); (c) kartu modal Refund/S&K/Masuk tepat di tengah frame.
const frames = figma.currentPage.findAllWithCriteria({ types: ["FRAME"] })
  .filter((f) => f.parent === figma.currentPage);
let populer = 0, lihat = 0, more = 0;
const moreFrames = [];
for (const f of frames) {
  for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
    const c = t.characters || "";
    if (c === "Populer") populer++;
    if (c === "Lihat semua") lihat++;
    if (c === "Harga mulai dari, final di halaman produk") { more++; moreFrames.push(f.id); }
  }
}
const cards = [];
for (const fid of ["13:2", "13:111", "10:2", "10:105", "162:2", "162:111"]) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { cards.push({ frame: fid, error: "tidak ditemukan" }); continue; }
  const veilIdx = f.children.findIndex((c) => c.name === "Veil");
  const card = veilIdx >= 0 ? f.children[veilIdx + 1] : null;
  cards.push({
    frame: fid, frameH: Math.round(f.height),
    cardY: card ? Math.round(card.y) : null, cardH: card ? Math.round(card.height) : null,
    cardCenter: card ? Math.round(card.y + card.height / 2) : null,
    frameCenter: Math.round(f.height / 2),
    offBy: card ? Math.round((card.y + card.height / 2) - f.height / 2) : null,
  });
}
return { nFrames: frames.length, populer, lihat, more, moreFrames, cards };
