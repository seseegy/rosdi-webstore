// Probe read-only: teks "Berakhir*" lengkap + frame-nya.
const frames = figma.currentPage.children.filter(n => n.type === "FRAME");
const out = [];
for (const fr of frames) {
  for (const t of fr.findAll(n => n.type === "TEXT")) {
    if (t.characters.startsWith("Berakhir")) out.push({ frame: fr.id, name: fr.name, text: t.characters, x: Math.round(t.x), y: Math.round(t.y) });
  }
}
return out;
