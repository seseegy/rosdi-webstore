// Read-only: dump struktur frame MLBB mobile (1:208 Light) + Free Fire mobile
// (111:2 Light) untuk rencana sinkron grid 3-kolom -> 2-kolom + catatan stok.
// Dua level dalam: tiap anak frame + anak-anaknya.
const out = {};
for (const fid of ["1:314", "111:139"]) {
  const frame = await figma.getNodeByIdAsync(fid);
  const nodes = [];
  function dump(n, depth, base) {
    const b = n.absoluteBoundingBox;
    const rel = { x: +(b.x - base.x).toFixed(1), y: +(b.y - base.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    const item = { depth, id: n.id, name: n.name, type: n.type, ...rel };
    if (n.type === "TEXT") item.chars = n.characters.slice(0, 60);
    nodes.push(item);
    if (depth < 2 && "children" in n) for (const c of n.children) dump(c, depth + 1, base);
  }
  const fb = frame.absoluteBoundingBox;
  dump(frame, 0, fb);
  out[fid] = { frame: frame.name, w: frame.width, h: frame.height, count: nodes.length, nodes };
}
return out;
