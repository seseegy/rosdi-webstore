const frames = [
  { id: "111:2", label: "FF mobile Light" },
  { id: "111:139", label: "FF mobile Dark" },
  { id: "1:208", label: "MLBB mobile Light" },
  { id: "1:314", label: "MLBB mobile Dark" },
];
const out = [];
for (const f of frames) {
  const frame = await figma.getNodeByIdAsync(f.id);
  const texts = frame.findAll((n) => n.type === "TEXT");
  const was10500 = texts.filter((t) => t.characters.includes("10.500"));
  const was185000 = texts.filter((t) => t.characters.includes("185.000"));
  out.push({
    frame: f.label,
    totalTexts: texts.length,
    was10500: was10500.map((t) => ({ id: t.id, name: t.name, chars: t.characters, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) })),
    was185000: was185000.map((t) => ({ id: t.id, name: t.name, chars: t.characters, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) })),
  });
}
return out;
