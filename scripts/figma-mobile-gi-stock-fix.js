// Siklus 60: sinkron catatan stok Langkah 3 Genshin mobile ke kode —
// "Stok: tersedia" -> "Stok tersedia · maksimal 10 per transaksi"
// (CheckoutShell.jsx:85; pola MLBB Siklus 50: lebar 196, 2 baris, HEIGHT).
// Kartu Langkah 3 Genshin: y=552 h=96 (bawah 648); catatan y=612, jadi
// 2 baris (bawah 640) masih muat dengan padding 8px — tanpa geser.
// Bila ternyata meluber, kartu tumbuh + simpul di bawahnya geser (defensif).
const OLD = "Stok: tersedia";
const NEW = "Stok tersedia · maksimal 10 per transaksi";
const NOTE_W = 196;
const PAD = 8;

async function fixFrame(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const notes = frame.findAllWithCriteria({ types: ["TEXT"] })
    .filter(t => t.characters === OLD);
  const out = { frame: frame.name, count: notes.length };
  for (const n of notes) {
    const segs = n.getStyledTextSegments(["fontName"]);
    for (const s of segs) await figma.loadFontAsync(s.fontName);
    n.textAutoResize = "HEIGHT";
    n.characters = NEW;
    n.name = NEW;
    n.resize(NOTE_W, n.height);
  }
  if (notes.length === 0) return out;
  const n = notes[0];
  out.note = { id: n.id, x: +n.x.toFixed(1), y: +n.y.toFixed(1), w: +n.width.toFixed(1), h: +n.height.toFixed(1) };
  // kartu Langkah 3 = RECTANGLE w=358 yang memuat catatan
  const card = frame.findAllWithCriteria({ types: ["RECTANGLE"] })
    .find(r => r.width === 358 && r.y <= n.y && r.y + r.height >= n.y + n.height);
  out.card = card ? { id: card.id, y: +card.y.toFixed(1), h: +card.height.toFixed(1), bottom: +(card.y + card.height).toFixed(1) } : null;
  out.noteBottom = +(n.y + n.height).toFixed(1);
  out.padding = card ? +(card.y + card.height - (n.y + n.height)).toFixed(1) : null;
  if (card && out.padding < PAD) {
    const delta = PAD - out.padding;
    const cardBottom = card.y + card.height;
    const kids = frame.children.map(c => ({ n: c, y: c.y }));
    card.height = card.height + delta;
    for (const k of kids) {
      if (k.y >= cardBottom && k.n !== card) k.n.y = k.y + delta;
    }
    frame.resize(frame.width, frame.height + delta);
    out.grew = delta;
  } else {
    out.grew = 0;
  }
  return out;
}
return { light: await fixFrame("6:2"), dark: await fixFrame("6:108") };
