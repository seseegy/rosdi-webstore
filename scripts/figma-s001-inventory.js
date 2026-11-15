// Probe read-only batch s001: inventaris frame (nama, x, y, w, h) + hitung.
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
return {
  frameCount: frames.length,
  frames: frames.map((f) => ({ id: f.id, name: f.name, x: f.x, y: f.y, w: f.width, h: f.height })),
};
