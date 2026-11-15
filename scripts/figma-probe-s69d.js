// Probe triase Siklus 69d (read-only): geometri kartu + judul modal Refund
// vs dua teks latar yang di-flag probe overflow — koordinat lokal frame
// dan absolut, plus parent masing-masing simpul.
const f = await figma.getNodeByIdAsync("13:2");
if (!f) return { error: "frame 13:2 tidak ditemukan" };
const abs = f.absoluteBoundingBox;
const veilIdx = f.children.findIndex((c) => c.name === "Veil");
const card = f.children[veilIdx + 1];
const out = {
  frameAbsY: abs.y, frameH: f.height, veilIdx,
  card: card ? { id: card.id, name: card.name, yLocal: card.y, h: card.height, absY: card.absoluteBoundingBox.y } : null,
};
if (card) {
  out.cardKids = card.children.map((c) => ({
    id: c.id, name: c.name, type: c.type,
    yLocalInCard: Math.round(c.y), h: Math.round(c.height),
    absY: Math.round(c.absoluteBoundingBox.y),
    chars: (c.characters || "").slice(0, 40),
  }));
}
// dua teks latar yang di-flag
const texts = f.findAllWithCriteria({ types: ["TEXT"] });
out.bgTexts = texts
  .filter((t) => (t.characters || "").startsWith("Telkomsel, Indosat") || (t.characters || "").startsWith("Kuota utama"))
  .map((t) => ({
    id: t.id, parent: t.parent ? t.parent.id + " " + t.parent.name : "?",
    chars: t.characters.slice(0, 40),
    yLocalInParent: Math.round(t.y), absY: Math.round(t.absoluteBoundingBox.y),
    h: Math.round(t.height),
  }));
return out;
