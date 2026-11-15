// Perbaikan Siklus 31: pindah badge "-10%" kartu flash sale dari baris harga
// (menimpa "Rp30.900"/"Rp10.500") ke baris tile, rata kanan — sesuai kode
// (Home.jsx: badge di baris judul, marginLeft auto; baris harga hanya Rp + coret).
// Frame desktop (20:2/21:2) sudah benar (badge di baris judul) -> tidak disentuh:
// hanya badge yang sebaris dengan harga coret yang dipindah.
const TARGET_FRAMES = ['1:2', '1:105', '10:2', '10:105', '13:2', '13:111', '15:2', '15:105'];
const moved = [], skipped = [];
for (const fid of TARGET_FRAMES) {
  const frame = figma.getNodeById(fid);
  if (!frame) { skipped.push({ frame: fid, why: 'frame tidak ditemukan' }); continue; }
  const texts = frame.findAllWithCriteria({ types: ['TEXT'] });
  const rects = frame.findAllWithCriteria({ types: ['RECTANGLE'] });
  for (const bt of texts.filter(t => t.characters.trim() === '-10%')) {
    const tb = bt.absoluteBoundingBox;
    // Hanya badge yang sebaris dengan harga coret (cacat); badge baris judul dilewati.
    const was = texts.find(t => /Rp(30\.900|10\.500)/.test(t.characters) &&
      Math.abs(t.absoluteBoundingBox.y - tb.y) <= 10);
    if (!was) { skipped.push({ frame: fid, badge: bt.id, why: 'sudah di baris judul' }); continue; }
    const bg = rects.find(r => {
      const b = r.absoluteBoundingBox;
      return b.x <= tb.x + 1 && b.y <= tb.y + 1 &&
        b.x + b.width >= tb.x + tb.width - 1 && b.y + b.height >= tb.y + tb.height - 1 &&
        b.width < 120 && b.height < 40;
    });
    if (!bg) { skipped.push({ frame: fid, badge: bt.id, why: 'latar badge tidak ketemu' }); continue; }
    const card = rects.find(r => {
      const b = r.absoluteBoundingBox;
      return b.width >= 165 && b.width <= 185 && b.height >= 100 && b.height <= 130 &&
        b.x <= tb.x && b.y <= tb.y &&
        b.x + b.width >= tb.x + tb.width && b.y + b.height >= tb.y + tb.height;
    });
    if (!card) { skipped.push({ frame: fid, badge: bt.id, why: 'kartu tidak ketemu' }); continue; }
    const cb = card.absoluteBoundingBox;
    const tile = rects.find(r => {
      const b = r.absoluteBoundingBox;
      return b.width >= 40 && b.width <= 48 && b.height >= 40 && b.height <= 48 &&
        b.x >= cb.x && b.x + b.width <= cb.x + cb.width &&
        b.y >= cb.y && b.y + b.height <= cb.y + cb.height;
    });
    if (!tile) { skipped.push({ frame: fid, badge: bt.id, why: 'tile tidak ketemu' }); continue; }
    const bb = bg.absoluteBoundingBox, tlb = tile.absoluteBoundingBox;
    const newBgAbsX = cb.x + cb.width - 12 - bb.width;
    const newBgAbsY = tlb.y + (tlb.height - bb.height) / 2;
    const newTextAbsX = newBgAbsX + (bb.width - tb.width) / 2;
    const newTextAbsY = newBgAbsY + (bb.height - tb.height) / 2;
    const bgParent = bg.parent.absoluteBoundingBox || { x: frame.x, y: frame.y };
    const txParent = bt.parent.absoluteBoundingBox || { x: frame.x, y: frame.y };
    bg.x = newBgAbsX - bgParent.x; bg.y = newBgAbsY - bgParent.y;
    bt.x = newTextAbsX - txParent.x; bt.y = newTextAbsY - txParent.y;
    moved.push({ frame: fid, badge: bt.id, bg: bg.id,
      from: { x: +tb.x.toFixed(1), y: +tb.y.toFixed(1) },
      to: { x: +newTextAbsX.toFixed(1), y: +newTextAbsY.toFixed(1) } });
  }
}
return { movedCount: moved.length, moved, skipped };
