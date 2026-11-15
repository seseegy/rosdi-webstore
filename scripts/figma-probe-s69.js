// Probe read-only Siklus 69: (a) cari semua teks "Populer" / "Lihat semua" di
// seluruh file (frame Beranda mobile + klonnya), ukur geometri + font;
// (b) geometri kartu modal Refund (13:2/13:111) vs tengah frame.
const frames = figma.currentPage.findAllWithCriteria({ types: ["FRAME"] })
  .filter((f) => f.parent === figma.currentPage);
const hits = [];
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    const c = t.characters || "";
    if (c === "Populer" || c === "Lihat semua" || c === "Top Up Game") {
      hits.push({
        frame: f.id, frameName: f.name, frameW: Math.round(f.width), frameH: Math.round(f.height),
        id: t.id, chars: c, x: Math.round(t.x), y: Math.round(t.y),
        w: Math.round(t.width), h: Math.round(t.height),
        fs: t.fontSize, font: t.fontName ? t.fontName.family + " " + t.fontName.style : "?",
      });
    }
  }
}
const refund = [];
for (const fid of ["13:2", "13:111"]) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { refund.push({ frame: fid, error: "tidak ditemukan" }); continue; }
  const veilIdx = f.children.findIndex((c) => c.name === "Veil");
  const card = veilIdx >= 0 ? f.children[veilIdx + 1] : null;
  refund.push({
    frame: fid, frameName: f.name, frameH: Math.round(f.height),
    veilIdx, cardId: card ? card.id : null, cardName: card ? card.name : null,
    cardY: card ? Math.round(card.y) : null, cardH: card ? Math.round(card.height) : null,
    cardCenter: card ? Math.round(card.y + card.height / 2) : null,
    frameCenter: Math.round(f.height / 2),
    delta: card ? Math.round(f.height / 2 - (card.y + card.height / 2)) : null,
  });
}
return { nFrames: frames.length, nHits: hits.length, hits, refund };
