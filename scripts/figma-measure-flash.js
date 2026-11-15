// Read-only: ukur tumpang badge "-10%" vs harga coret flash sale di semua frame.
// Revisi Siklus 31: pakai absoluteBoundingBox (x/y relatif parent menyesatkan).
const out = [];
for (const frame of figma.currentPage.children) {
  const texts = frame.findAllWithCriteria({ types: ['TEXT'] });
  const badges = [];
  const wasPrices = [];
  for (const t of texts) {
    if (t.characters.trim() === '-10%') {
      const p = t.parent;
      const src = (p && p.type !== 'PAGE' && p.absoluteBoundingBox) ? p.absoluteBoundingBox : t.absoluteBoundingBox;
      badges.push({ id: t.id, x: +src.x.toFixed(1), y: +src.y.toFixed(1),
                    w: +src.width.toFixed(1), h: +src.height.toFixed(1),
                    kind: (p && p.type !== 'PAGE') ? p.type : 'TEXT' });
    }
    if (/Rp(30\.900|10\.500)/.test(t.characters)) {
      const b = t.absoluteBoundingBox;
      wasPrices.push({ id: t.id, chars: t.characters, x: +b.x.toFixed(1), y: +b.y.toFixed(1),
                       w: +b.width.toFixed(1), h: +b.height.toFixed(1) });
    }
  }
  if (badges.length === 0 || wasPrices.length === 0) continue;
  const overlaps = [];
  for (const wp of wasPrices) {
    for (const b of badges) {
      const yOverlap = b.y < wp.y + wp.h && wp.y < b.y + b.h;
      const xOverlap = b.x < wp.x + wp.w && wp.x < b.x + b.w;
      if (yOverlap && xOverlap) {
        overlaps.push({ was: wp.chars, wasId: wp.id, wasRight: +(wp.x + wp.w).toFixed(1),
                        badgeId: b.id, badgeX: +b.x.toFixed(1), badgeKind: b.kind,
                        coveredPx: +((wp.x + wp.w) - b.x).toFixed(1) });
      }
    }
  }
  out.push({ frame: frame.name, frameId: frame.id, badges, wasPrices, overlaps });
}
return { framesWithBadgeAndWas: out.length, frames: out };
