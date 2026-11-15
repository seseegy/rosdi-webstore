// Read-only: dump isi kartu flash sale frame Beranda mobile Light (1:2) —
// geometri lengkap tiap simpul di dalam kartu, untuk merancang sinkron
// badge-wrap Siklus 72 (badge kini turun ke baris sendiri di <500px, kode
// Home.jsx flexWrap:"wrap"). Dipakai Siklus 72.
const frame = figma.getNodeById('1:2');
if (!frame) return { error: 'frame 1:2 tidak ditemukan' };
const texts = frame.findAllWithCriteria({ types: ['TEXT'] });
const rects = frame.findAllWithCriteria({ types: ['RECTANGLE'] });
const cards = [];
for (const bt of texts.filter(t => t.characters.trim() === '-10%')) {
  const tb = bt.absoluteBoundingBox;
  const card = rects.find(r => {
    const b = r.absoluteBoundingBox;
    return b.width >= 165 && b.width <= 185 && b.height >= 100 && b.height <= 140 &&
      b.x <= tb.x && b.y <= tb.y &&
      b.x + b.width >= tb.x + tb.width && b.y + b.height >= tb.y + tb.height;
  });
  if (!card) { cards.push({ badgeId: bt.id, error: 'kartu tidak ketemu' }); continue; }
  const cb = card.absoluteBoundingBox;
  const inside = [];
  const all = [...frame.findAllWithCriteria({ types: ['TEXT'] }),
               ...frame.findAllWithCriteria({ types: ['RECTANGLE'] })];
  for (const n of all) {
    const b = n.absoluteBoundingBox;
    if (b.x >= cb.x - 1 && b.y >= cb.y - 1 &&
        b.x + b.width <= cb.x + cb.width + 1 && b.y + b.height <= cb.y + cb.height + 1) {
      inside.push({ id: n.id, type: n.type, name: n.name,
        chars: n.type === 'TEXT' ? n.characters.slice(0, 40) : undefined,
        x: +(b.x - cb.x).toFixed(1), y: +(b.y - cb.y).toFixed(1),
        w: +b.width.toFixed(1), h: +b.height.toFixed(1) });
    }
  }
  inside.sort((a, b) => a.y - b.y || a.x - b.x);
  cards.push({ cardId: card.id, cardAbs: { x: +cb.x.toFixed(1), y: +cb.y.toFixed(1), w: +cb.width.toFixed(1), h: +cb.height.toFixed(1) }, inside });
}
return { frameH: frame.height, cards };
