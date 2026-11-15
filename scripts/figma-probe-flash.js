// Read-only: petakan geometri kartu flash sale per frame (badge, harga, coret, judul).
// Dipakai Siklus 31: badge -10% ternyata di baris harga, bukan baris judul (kode).
const out = [];
for (const frame of figma.currentPage.children) {
  const texts = frame.findAllWithCriteria({ types: ['TEXT'] });
  const rects = frame.findAllWithCriteria({ types: ['RECT'] });
  const badgeTexts = texts.filter(t => t.characters.trim() === '-10%');
  if (badgeTexts.length === 0) continue;
  const items = [];
  for (const bt of badgeTexts) {
    const tb = bt.absoluteBoundingBox;
    // Rect latar badge: RECT yang memuat bbox teks badge (toleransi 2px).
    const bg = rects.find(r => {
      const b = r.absoluteBoundingBox;
      return b.x <= tb.x + 2 && b.y <= tb.y + 2 &&
             b.x + b.width >= tb.x + tb.width - 2 &&
             b.y + b.height >= tb.y + tb.height - 2 &&
             b.width < 120 && b.height < 40;
    });
    const bb = bg ? bg.absoluteBoundingBox : tb;
    items.push({ badgeId: bt.id, badgeText: { x: +tb.x.toFixed(1), y: +tb.y.toFixed(1), w: +tb.width.toFixed(1), h: +tb.height.toFixed(1) },
                 badgeRect: { x: +bb.x.toFixed(1), y: +bb.y.toFixed(1), w: +bb.width.toFixed(1), h: +bb.height.toFixed(1) },
                 badgeRectId: bg ? bg.id : null });
  }
  const prices = texts.filter(t => /^(Rp27\.900|Rp9\.450)$/.test(t.characters.trim()))
    .map(t => { const b = t.absoluteBoundingBox;
      return { chars: t.characters, x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; });
  const wasPrices = texts.filter(t => /Rp(30\.900|10\.500)/.test(t.characters))
    .map(t => { const b = t.absoluteBoundingBox;
      return { id: t.id, chars: t.characters, x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; });
  const names = texts.filter(t => /^(Weekly Diamond Pass|70 Diamonds)$/.test(t.characters.trim()))
    .map(t => { const b = t.absoluteBoundingBox;
      return { chars: t.characters, x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; });
  out.push({ frame: frame.name, frameId: frame.id, frameX: frame.x, frameY: frame.y,
             frameW: frame.width, badges: items, prices, wasPrices, names });
}
return { frames: out };
