const frame = await figma.getNodeByIdAsync("1:2");
const rects = frame.findAll(n => n.type === "RECTANGLE");
// rect di sekitar teks Tagihan (482,305) dan di sekitar kartu (16,2033)
const near = rects.filter(r => {
  const cx = 482 + 24, cy = 305 + 7;
  const inTag = cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height;
  const isCard = Math.abs(r.x - 16) <= 2 && Math.abs(r.y - 2033) <= 2;
  const isRow = Math.abs(r.y - 296) <= 2 && r.width >= 60 && r.width <= 100;
  return inTag || isCard || isRow;
}).map(r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), name: r.name }));
const tag = frame.findAll(n => n.type === "TEXT" && n.characters === "Tagihan").map(t => ({ x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width) }));
const cardTitle = frame.findAll(n => n.type === "TEXT" && n.characters === "Token PLN").map(t => ({ x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), font: t.fontName.style + " " + t.fontSize }));
return { tagihanText: tag, cardTitles: cardTitle, rectsNear: near, totalRects: rects.length };
