// Read-only audit s442j (Figma): padding kartu modal — rect yang tepinya
// paling dekat dengan judul (gap atas terkecil) & tombol (gap bawah terkecil).
const out = { modals: [] };
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
for (const f of frames) {
  if (/^Modal (S&K|Kebijakan Pengembalian|Masuk)/.test(f.name) && !/Desktop/.test(f.name)) {
    const texts = f.findAll((n) => n.type === "TEXT");
    const title = texts.find((t) => /Syarat & Ketentuan|Kebijakan Pengembalian|Masuk ke Rosdi Store/.test(t.characters || ""));
    const tutup = texts.find((t) => (t.characters || "").trim() === "Tutup" || (t.characters || "").trim() === "Siap, lanjut belanja");
    const rects = f.children.filter((c) => c.type === "RECTANGLE").map((r) => r.absoluteBoundingBox);
    const tb = title.absoluteBoundingBox, ub = tutup.absoluteBoundingBox;
    const contains = (r, b) => b.x >= r.x - 1 && b.y >= r.y - 1 && b.x + b.width <= r.x + r.width + 1 && b.y + b.height <= r.y + r.height + 1;
    const topCands = rects.filter((r) => contains(r, tb)).map((r) => ({ w: Math.round(r.width), h: Math.round(r.height), gapTop: Math.round(tb.y - r.y), gapLeft: Math.round(tb.x - r.x) })).sort((a, b) => a.gapTop - b.gapTop);
    const botCands = rects.filter((r) => contains(r, ub)).map((r) => ({ w: Math.round(r.width), h: Math.round(r.height), gapBottom: Math.round((r.y + r.height) - (ub.y + ub.height)) })).sort((a, b) => a.gapBottom - b.gapBottom);
    out.modals.push({ frame: f.name, titleY: Math.round(tb.y), tutupY: Math.round(ub.y), topClosest: topCands.slice(0, 2), bottomClosest: botCands.slice(0, 2) });
  }
}
return out;
