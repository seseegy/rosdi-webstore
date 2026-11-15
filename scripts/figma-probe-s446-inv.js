// Probe s446 bagian 1: daftar Page + frame tingkat atas (ide 70) + frame Steam (ide 85).
const out = { pages: [], frames: [] };
for (const p of figma.root.children) {
  out.pages.push({ id: p.id, name: p.name, children: p.children.length });
}
const page = figma.currentPage;
for (const n of page.children) {
  out.frames.push({ id: n.id, name: n.name, type: n.type, w: Math.round(n.width), h: Math.round(n.height), x: Math.round(n.x), y: Math.round(n.y) });
}
out.frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
return out;
