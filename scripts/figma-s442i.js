// Read-only audit s442i (Figma): kartu modal = rect anak-langsung yang memuat
// teks judul + tombol Tutup; pad = selisih bbox absolut.
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
    const tb = title ? title.absoluteBoundingBox : null;
    const ub = tutup ? tutup.absoluteBoundingBox : null;
    // kartu = rect TERKECIL yang memuat judul DAN tombol (veil selebar frame ikut lolos — abaikan)
    const containing = rects.filter((r) => tb && ub && tb.x >= r.x - 1 && tb.y >= r.y - 1 && ub.x + ub.width <= r.x + r.width + 1 && ub.y + ub.height <= r.y + r.height + 1);
    containing.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    const card = containing[0];
    if (card && tb && ub) {
      const inner = texts.filter((t) => { const b = t.absoluteBoundingBox; return b.x >= card.x && b.y >= card.y && b.x + b.width <= card.x + card.width && b.y + b.height <= card.y + card.height; });
      const first = inner[0].absoluteBoundingBox, last = inner[inner.length - 1].absoluteBoundingBox;
      out.modals.push({ frame: f.name, cardW: Math.round(card.width), cardH: Math.round(card.height), padTop: Math.round(first.y - card.y), padLeft: Math.round(first.x - card.x), padBottom: Math.round((card.y + card.height) - (last.y + last.height)), padRight: Math.round((card.x + card.width) - (first.x + first.width)), nTexts: inner.length });
    } else {
      out.modals.push({ frame: f.name, card: null, rectCount: rects.length, titleFound: !!tb, tutupFound: !!ub });
    }
  }
}
return out;
