// Read-only: dump anak level-1 frame Pulsa Light (2:2) & E-Wallet Light (3:2).
async function dumpFrame(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const fb = frame.absoluteBoundingBox;
  const out = [];
  for (const c of frame.children) {
    const b = c.absoluteBoundingBox;
    const item = { id: c.id, name: c.name, type: c.type, x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    if (c.type === "TEXT") item.chars = c.characters.slice(0, 60);
    out.push(item);
  }
  return { frame: frame.name, w: frame.width, h: frame.height, nodes: out };
}
const p = await dumpFrame("2:2");
const e = await dumpFrame("3:2");
return { pulsa: p, emoney: e };
