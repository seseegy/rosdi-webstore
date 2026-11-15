const frame = await figma.getNodeByIdAsync("1:2");
// semua kartu bill (rect 173 lebar) + teks di dalamnya
const rects = frame.findAll(n => n.type === "RECTANGLE" && n.width >= 170 && n.width <= 176);
const texts = frame.findAll(n => n.type === "TEXT");
const out = [];
for (const r of rects){
  const inside = texts.filter(t => t.x >= r.x - 1 && t.x < r.x + r.width && t.y >= r.y - 1 && t.y < r.y + r.height)
    .map(t => ({ text: t.characters.slice(0, 28), x: Math.round(t.x), y: Math.round(t.y) }));
  out.push({ rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), name: r.name }, texts: inside });
}
out.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
return out;
