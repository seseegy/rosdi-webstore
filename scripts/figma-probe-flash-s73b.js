// Probe read-only Siklus 73: anggota kartu flash 1:33 di frame 1:2 —
// tipe, nama, chars, fontSize, x/y/w/h, agar klasifikasi builder diperbaiki.
const f = await figma.getNodeByIdAsync("1:2");
const card = await figma.getNodeByIdAsync("1:33");
if (!f || !card) return { error: "tidak ditemukan" };
const members = f.children.filter((c) => c !== card
  && c.x >= card.x - 1 && c.y >= card.y - 1
  && c.x + c.width <= card.x + 175 && c.y + c.height <= card.y + 119);
const out = [];
for (const c of members) {
  const o = { id: c.id, type: c.type, name: c.name,
    x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) };
  if (c.type === "TEXT") {
    o.chars = c.characters;
    try { o.fontSize = c.fontSize; } catch (e) { o.fontSize = "ERR:" + e.message; }
    try { const s = c.getStyledTextSegments(["fontSize", "fontName"]); o.segs = s.map((x) => [x.fontSize, x.fontName.family + "/" + x.fontName.style, x.characters]); } catch (e) { o.segsErr = e.message; }
  }
  if (c.type === "RECTANGLE") { o.fills = JSON.stringify(c.fills).slice(0, 120); o.radius = c.cornerRadius; }
  out.push(o);
}
return { card: { x: Math.round(card.x), y: Math.round(card.y), w: Math.round(card.width), h: Math.round(card.height) }, n: members.length, members: out };
