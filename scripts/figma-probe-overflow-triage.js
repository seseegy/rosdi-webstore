// Read-only: tutup triase probe overflow Siklus 59.
// (a) textAlignHorizontal harga FF (111:122, 111:127) — bila LEFT, tumpang
//     harga-vs-badge adalah artefak kotak teks w=134, bukan cacat visual.
// (b) Oklusi modal: di frame 13:111 & 10:2, apakah kartu modal (RECTANGLE
//     opaque) menutupi area tumpang teks-latar vs teks-modal, dan apakah
//     kartu itu sesudah teks latar dalam urutan children (di atasnya)?
async function align(id) {
  const n = await figma.getNodeByIdAsync(id);
  return { id, chars: n.characters, align: n.textAlignHorizontal, fontSize: n.fontSize, autoResize: n.textAutoResize, w: n.width };
}
async function modal(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const fb = frame.absoluteBoundingBox;
  const kids = frame.children;
  const veilIdx = kids.findIndex(c => c.name === "Veil");
  const veil = veilIdx >= 0 ? kids[veilIdx] : null;
  // kartu modal = RECTANGLE opaque terbesar sesudah veil, lebar ~358
  let card = null, cardIdx = -1;
  for (let i = veilIdx + 1; i < kids.length; i++) {
    const c = kids[i];
    if (c.type === "RECTANGLE" && c.width >= 340 && c.width <= 380 && c.height >= 200 && c.height <= 400) { card = c; cardIdx = i; break; }
  }
  const rel = n => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  // teks modal pertama (judul) & teks isi: anak TEXT sesudah kartu
  const after = kids.slice(cardIdx + 1).filter(c => c.type === "TEXT");
  // teks latar yang tumpang: anak TEXT sebelum veil yang beririsan dengan kartu
  const cb = card ? rel(card) : null;
  const bgOverlap = cb ? kids.slice(0, veilIdx).filter(c => {
    if (c.type !== "TEXT") return false;
    const b = rel(c);
    return Math.min(b.x + b.w, cb.x + cb.w) - Math.max(b.x, cb.x) >= 2 && Math.min(b.y + b.h, cb.y + cb.h) - Math.max(b.y, cb.y) >= 2;
  }).length : -1;
  return { frame: frame.name, veilIdx, veil: veil ? rel(veil) : null, cardIdx, card: cb, modalTextCount: after.length, bgTextOverlappingCard: bgOverlap, totalChildren: kids.length };
}
return {
  ffPrice70: await align("111:122"),
  ffPrice140: await align("111:127"),
  refundDark: await modal("13:111"),
  skLight: await modal("10:2"),
};
