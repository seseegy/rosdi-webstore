const IDS = ["1:2","10:2","13:2","162:2","20:2","165:2","170:2"];
const out = [];
for (const fid of IDS){
  const frame = await figma.getNodeByIdAsync(fid);
  if (!frame){ out.push({ id: fid, err: "null" }); continue; }
  // rect besar (>=300 lebar) — kandidat background/kartu/FooterBg yang pindah
  const big = frame.findAll(n => n.type === "RECTANGLE" && n.width >= 300)
    .map(r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), name: r.name }));
  // semua teks "Token PLN" dan "Top Up Game" beserta fontnya
  const dup = frame.findAll(n => n.type === "TEXT" && (n.characters === "Token PLN" || n.characters === "Top Up Game"))
    .map(t => ({ text: t.characters, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width),
      font: t.fontName.family + " " + t.fontName.style + " " + t.fontSize }));
  out.push({ id: fid, name: frame.name, big, dup });
}
return out;
