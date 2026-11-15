const jobs = [
  { frameId: "111:2", label: "FF Mobile Light" },
  { frameId: "111:139", label: "FF Mobile Dark" },
  { frameId: "1:208", label: "MLBB Mobile Light" },
  { frameId: "1:314", label: "MLBB Mobile Dark" },
];
const out = [];
for (const j of jobs) {
  const frame = await figma.getNodeByIdAsync(j.frameId);
  const all = frame.findAll(() => true);
  const cells = all.filter((n) => (n.type === "RECTANGLE" || n.type === "FRAME") && Math.abs(n.width - 158) < 1 && Math.abs(n.height - 54) < 1)
    .map((n) => ({ id: n.id, name: n.name, x: Math.round(n.x), y: Math.round(n.y) }));
  const badges = all.filter((n) => n.type === "RECTANGLE" && Math.abs(n.width - 42) < 3 && Math.abs(n.height - 14) < 3)
    .map((n) => ({ id: n.id, name: n.name, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) }));
  const badgeTexts = frame.findAll((n) => n.type === "TEXT" && (n.characters === "-10%" || n.characters === "-5%" || n.characters === "Terlaris"))
    .map((t) => ({ id: t.id, chars: t.characters, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height), fs: t.fontSize }));
  const prices = frame.findAll((n) => n.type === "TEXT" && /^Rp\d/.test(n.characters) && n.fontSize === 12)
    .map((t) => ({ id: t.id, chars: t.characters, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) }));
  out.push({ frame: j.label, cells, badges, badgeTexts, prices });
}
return out;
