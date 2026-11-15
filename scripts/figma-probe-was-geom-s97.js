const jobs = [
  { frameId: "87:2", label: "FF Desktop Light", price: "Rp9.450", was: "Rp10.500" },
  { frameId: "26:2", label: "MLBB Desktop Light", price: "Rp175.500", was: "Rp185.000" },
  { frameId: "111:2", label: "FF Mobile Light", price: "Rp9.450", was: null },
  { frameId: "1:208", label: "MLBB Mobile Light", price: "Rp175.500", was: null },
];
const out = [];
for (const j of jobs) {
  const frame = await figma.getNodeByIdAsync(j.frameId);
  const texts = frame.findAll((n) => n.type === "TEXT");
  const price = texts.filter((t) => t.characters === j.price);
  const was = j.was ? texts.filter((t) => t.characters === j.was) : [];
  const badges = frame.findAll((n) => n.type === "RECTANGLE" && n.name && n.name.toLowerCase().includes("badge"));
  const badgeTexts = texts.filter((t) => t.characters === "-10%" || t.characters === "-5%");
  const fmt = (t) => ({ id: t.id, name: t.name, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height), fs: t.fontSize, parent: t.parent ? t.parent.name : null, parentType: t.parent ? t.parent.type : null });
  out.push({
    frame: j.label,
    price: price.map(fmt),
    was: was.map(fmt),
    badgeRects: badges.map((b) => ({ id: b.id, name: b.name, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) })),
    badgeTexts: badgeTexts.map(fmt),
  });
}
return out;
