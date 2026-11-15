// Siklus 97b: cek fill pasangan badge -5% (rect + teks) di 4 frame MLBB + 1 acuan dark.
const jobs = [
  { frameId: "1:208", label: "MLBB Mobile Light", rectId: "1:258", textChars: "-5%" },
  { frameId: "1:314", label: "MLBB Mobile Dark", rectId: "1:364", textChars: "-5%" },
  { frameId: "26:2", label: "MLBB Desktop Light", rectId: "26:83", textChars: "-5%" },
  { frameId: "26:281", label: "MLBB Desktop Dark", rectId: "26:362", textChars: "-5%" },
  { frameId: "87:258", label: "FF Desktop Dark (acuan)", rectId: "87:308", textChars: "-10%" },
];
const out = [];
for (const j of jobs) {
  const frame = await figma.getNodeByIdAsync(j.frameId);
  const rect = await figma.getNodeByIdAsync(j.rectId);
  const texts = frame.findAll((n) => n.type === "TEXT" && n.characters === j.textChars);
  const fmt = (fills) => (fills || []).map((f) => ({ color: f.color ? [+(f.color.r).toFixed(3), +(f.color.g).toFixed(3), +(f.color.b).toFixed(3)] : null }));
  const near = texts.map((t) => ({ id: t.id, x: Math.round(t.x), y: Math.round(t.y), fills: fmt(t.fills), fontName: t.fontName }));
  out.push({ frame: j.label, rect: { id: rect.id, x: Math.round(rect.x), y: Math.round(rect.y), fills: fmt(rect.fills) }, texts: near });
}
return out;
