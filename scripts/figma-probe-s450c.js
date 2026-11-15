// Read-only probe final s450: kartu = RECTANGLE pembungkus (struktur Figma datar).
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const out = {};
// pembungkus terkecil: RECTANGLE/FRAME (bukan frame atas) yang memuat pusat teks
function wrapper(fr, t) {
  const tb = t.absoluteBoundingBox, cx = tb.x + tb.width / 2, cy = tb.y + tb.height / 2;
  const cands = fr.findAll((n) => (n.type === "RECTANGLE" || n.type === "FRAME") && n !== fr && n.visible && n.absoluteBoundingBox.x <= cx && n.absoluteBoundingBox.y <= cy && n.absoluteBoundingBox.x + n.absoluteBoundingBox.width >= cx && n.absoluteBoundingBox.y + n.absoluteBoundingBox.height >= cy);
  cands.sort((a, b) => (a.width * a.height) - (b.width * b.height));
  return cands[0] || null;
}
// i81 final
out.i81 = {};
for (const [key, fid] of [["mobL", "1:2"], ["deskL", "20:2"]]) {
  const fr = F(fid);
  const list = [];
  for (const t of fr.findAllWithCriteria({ types: ["TEXT"] }).filter((x) => /^Mulai Rp/.test(x.characters))) {
    const w = wrapper(fr, t);
    if (!w) { list.push({ d: null }); continue; }
    const wb = w.absoluteBoundingBox, tb = t.absoluteBoundingBox;
    const name = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((x) => x.fontSize === 14.5 && x.absoluteBoundingBox.x >= wb.x && x.absoluteBoundingBox.x + x.absoluteBoundingBox.width <= wb.x + wb.width && x.absoluteBoundingBox.y >= wb.y && x.absoluteBoundingBox.y + x.absoluteBoundingBox.height <= wb.y + wb.height)[0];
    list.push({ name: name ? name.characters.slice(0, 24) : null, d: r1((wb.y + wb.height) - (tb.y + tb.height)), cardW: r1(wb.width), cardH: r1(wb.height) });
  }
  out.i81[key] = list;
}
// i82 final: semua teks + rect di area Langkah 1 (y 80-280) frame Produk Game mobile
out.i82 = {};
{
  const fr = F("1:208");
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.absoluteBoundingBox.y >= 80 && t.absoluteBoundingBox.y < 300)
    .map((t) => { const b = t.absoluteBoundingBox; return { txt: t.characters.slice(0, 30), fs: t.fontSize, x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; });
  const rects = fr.findAllWithCriteria({ types: ["RECTANGLE"] }).filter((n) => n.absoluteBoundingBox.y >= 80 && n.absoluteBoundingBox.y < 300)
    .map((n) => { const b = n.absoluteBoundingBox; return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; });
  out.i82 = { texts, rects };
}
// i83 final: kartu Langkah 1 = pembungkus judul langkah
out.i83 = {};
for (const [key, fid] of [["mobL", "1:208"], ["deskL", "26:2"]]) {
  const fr = F(fid);
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /Masukkan User ID/.test(x.characters));
  const w = t ? wrapper(fr, t) : null;
  out.i83[key] = w ? { h: r1(w.absoluteBoundingBox.height), w: r1(w.absoluteBoundingBox.width), type: w.type } : null;
}
// i87 final: kartu flash = pembungkus fill progress
out.i87 = {};
for (const [key, fid] of [["mobL", "1:2"], ["deskL", "20:2"]]) {
  const fr = F(fid);
  const rows = [];
  for (const tr of fr.findAllWithCriteria({ types: ["RECTANGLE"] }).filter((n) => Math.abs(n.height - 6) < 0.6 && n.fills && n.fills[0] && n.fills[0].color && Math.round(n.fills[0].color.b * 255) === 235)) {
    const tb = tr.absoluteBoundingBox;
    const track = fr.findAllWithCriteria({ types: ["RECTANGLE"] }).find((n) => n !== tr && Math.abs(n.height - 6) < 0.6 && Math.abs(n.absoluteBoundingBox.y - tb.y) < 1);
    const card = wrapper(fr, tr);
    rows.push({ trackW: track ? r1(track.absoluteBoundingBox.width) : null, fillW: r1(tb.width), cardW: card ? r1(card.absoluteBoundingBox.width) : null, ratio: (track && card) ? +(r1(track.absoluteBoundingBox.width) / r1(card.absoluteBoundingBox.width)).toFixed(3) : null });
  }
  out.i87[key] = rows;
}
return out;
