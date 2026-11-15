// Read-only: selidiki tumpang harga vs badge di sel 172 DM & 706 DM frame MLBB (Siklus 59).
// Pertanyaan: apakah glif harga benar-benar menyentuh badge, atau hanya kotak
// teks (w=134) yang lebar? Butuh textAlignHorizontal + urutan z-order.
async function cell(frameId, y0, y1) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const out = [];
  for (const n of frame.children) {
    const b = n.absoluteBoundingBox;
    const ry = b.y - frame.absoluteBoundingBox.y;
    if (ry + b.height < y0 || ry > y1) continue;
    const item = { id: n.id, name: n.name.slice(0, 40), type: n.type, x: +b.x.toFixed(1), y: +ry.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    if (n.type === "TEXT") {
      item.chars = n.characters.slice(0, 30);
      item.align = n.textAlignHorizontal;
      item.fontSize = n.fontSize;
      item.autoResize = n.textAutoResize;
    }
    if (n.type === "RECTANGLE" && n.fills && n.fills.length) {
      const f = n.fills[0];
      item.fill = f.type === "SOLID" ? { r: +f.color.r.toFixed(2), g: +f.color.g.toFixed(2), b: +f.color.b.toFixed(2) } : f.type;
    }
    out.push(item);
  }
  return out;
}
return {
  mlbb172: await cell("1:208", 560, 600),
  mlbb706: await cell("1:208", 684, 724),
  ff70: await cell("111:2", 57490, 57530),
};
