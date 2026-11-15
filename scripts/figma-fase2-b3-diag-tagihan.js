const IDS = ["1:2","20:2","10:2"];
const out = [];
for (const fid of IDS){
  const frame = await figma.getNodeByIdAsync(fid);
  if (!frame){ out.push({ id: fid, err: "null" }); continue; }
  const tags = frame.findAll(n => n.type === "TEXT" && n.characters === "Tagihan");
  const rows = tags.map(t => ({
    x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height),
    chars: t.characters, font: t.fontName.family + " " + t.fontName.style + " " + t.fontSize,
    fills: JSON.stringify(t.fills), opacity: t.opacity, visible: t.visible
  }));
  // bandingkan dengan chip Token PLN (referensi yang benar)
  const refs = frame.findAll(n => n.type === "TEXT" && n.characters === "Token PLN" && n.fontName.style === "Medium")
    .map(t => ({ x: Math.round(t.x), y: Math.round(t.y), fills: JSON.stringify(t.fills), opacity: t.opacity, visible: t.visible }));
  out.push({ id: fid, name: frame.name, tagihan: rows, tokenPLNchip: refs });
}
return out;
