// Discovery read-only s458: daftar semua frame tingkat atas (id, nama, y) + hitung total.
const all = figma.currentPage.children.filter((n) => n.type === "FRAME").map((f) => ({
  id: f.id, name: f.name, y: Math.round(f.absoluteBoundingBox.y), w: Math.round(f.width),
}));
const out = { frameCount: all.length, frames: all };
return out;
