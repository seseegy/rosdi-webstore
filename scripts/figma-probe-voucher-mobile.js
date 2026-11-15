// Read-only: dump struktur frame Voucher mobile (3:118 Light) untuk rencana klon Steam.
// Satu level dalam: tiap anak frame + anak-anaknya (nama, tipe, x/y/w/h relatif frame, teks).
const frame = await figma.getNodeByIdAsync("3:118");
const out = [];
function dump(n, depth, base) {
  const b = n.absoluteBoundingBox;
  const rel = { x: +(b.x - base.x).toFixed(1), y: +(b.y - base.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
  const item = { depth, id: n.id, name: n.name, type: n.type, ...rel };
  if (n.type === "TEXT") item.chars = n.characters.slice(0, 80);
  out.push(item);
  if (depth < 2 && "children" in n) for (const c of n.children) dump(c, depth + 1, base);
}
const fb = frame.absoluteBoundingBox;
dump(frame, 0, fb);
return { frame: frame.name, w: frame.width, h: frame.height, nodes: out };
