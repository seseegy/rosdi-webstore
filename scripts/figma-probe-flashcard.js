// Read-only: dump semua node di area kartu flash penuh frame 15:2 (y 8700..8900).
// Dipakai Siklus 31: kenali tile + kartu sebelum pindah badge -10%.
const frame = figma.getNodeById('15:2');
const out = [];
function walk(node, depth) {
  const b = node.absoluteBoundingBox;
  if (!b) return;
  if (b.y >= 8700 && b.y <= 8900 && b.x >= 0 && b.x <= 390) {
    out.push({ depth, id: node.id, type: node.type, name: node.name,
               chars: ('characters' in node) ? node.characters : undefined,
               x: +b.x.toFixed(1), y: +b.y.toFixed(1),
               w: +b.width.toFixed(1), h: +b.height.toFixed(1) });
  }
  if ('children' in node) for (const c of node.children) walk(c, depth + 1);
}
walk(frame, 0);
return { nodes: out };
