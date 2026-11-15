const out = {};
// 1) rects di Sukses mobile 4:2 (tombol) + teks penuh catatan bawah
{
  const f = await figma.getNodeByIdAsync("4:2");
  out["4:2"] = {
    rects: f.findAll(n => n.type === "RECTANGLE").map(r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), name: r.name, fills: JSON.stringify(r.fills), strokes: JSON.stringify(r.strokes), strokeWeight: r.strokeWeight, radius: r.cornerRadius })),
    note676: f.findAll(n => n.type === "TEXT" && Math.abs(n.y - 676) <= 2).map(t => ({ text: t.characters, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), font: t.fontName.style + " " + t.fontSize, fills: JSON.stringify(t.fills) })),
    frameH: f.height
  };
}
// 2) token-box + note di 77:2
{
  const f = await figma.getNodeByIdAsync("77:2");
  out["77:2"] = {
    rects: f.findAll(n => n.type === "RECTANGLE").map(r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), name: r.name, fills: JSON.stringify(r.fills), strokes: JSON.stringify(r.strokes), strokeWeight: r.strokeWeight, radius: r.cornerRadius })),
    tokenNote: f.findAll(n => n.type === "TEXT" && Math.abs(n.y - 342) <= 2).map(t => ({ text: t.characters, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), font: t.fontName.style + " " + t.fontSize })),
    frameH: f.height
  };
}
// 3) rects di Sukses Desktop 36:166 (tombol + footer)
{
  const f = await figma.getNodeByIdAsync("36:166");
  out["36:166"] = {
    rects: f.findAll(n => n.type === "RECTANGLE").filter(r => r.y >= 580 && r.y <= 660).map(r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), name: r.name, fills: JSON.stringify(r.fills), strokes: JSON.stringify(r.strokes), strokeWeight: r.strokeWeight, radius: r.cornerRadius })),
    frameH: f.height
  };
}
// 4) rects di Cek mobile 3:236 (tombol Cek + hasil)
{
  const f = await figma.getNodeByIdAsync("3:236");
  out["3:236"] = {
    rects: f.findAll(n => n.type === "RECTANGLE").map(r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), name: r.name })),
    frameH: f.height
  };
}
return out;
