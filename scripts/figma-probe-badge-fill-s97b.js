// Siklus 97b: cek fill + geometri badge yang dipindah pasca-sweep unslop paralel.
const jobs = [
  { frameId: "111:2", label: "FF Mobile Light" },
  { frameId: "1:208", label: "MLBB Mobile Light" },
];
const out = [];
for (const j of jobs) {
  const frame = await figma.getNodeByIdAsync(j.frameId);
  const texts = frame.findAll((n) => n.type === "TEXT" && (n.characters === "-10%" || n.characters === "-5%" || n.characters === "Terlaris"));
  const rects = frame.findAll((n) => n.type === "RECTANGLE" && Math.abs(n.width - 42) < 3 && Math.abs(n.height - 14) < 3);
  const fmtFill = (fills) => (fills || []).map((f) => ({ type: f.type, color: f.color ? { r: +(f.color.r).toFixed(3), g: +(f.color.g).toFixed(3), b: +(f.color.b).toFixed(3) } : null, opacity: f.opacity }));
  out.push({
    frame: j.label,
    badgeRects: rects.map((r) => ({ id: r.id, x: Math.round(r.x), y: Math.round(r.y), fills: fmtFill(r.fills), opacity: r.opacity, radius: r.cornerRadius })),
    badgeTexts: texts.map((t) => ({ id: t.id, chars: t.characters, x: Math.round(t.x), y: Math.round(t.y), fills: fmtFill(t.fills), fontName: t.fontName, fontSize: t.fontSize })),
  });
}
return out;
