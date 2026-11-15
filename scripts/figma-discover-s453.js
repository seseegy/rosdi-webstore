// Discovery read-only: daftar semua frame level atas (nama + id + ukuran) per page.
const out = { pages: [] };
for (const page of figma.root.children) {
  const frames = [];
  for (const n of page.children) {
    if (n.type === "FRAME") {
      const b = n.absoluteBoundingBox || {};
      frames.push({ id: n.id, name: n.name, x: Math.round(b.x || 0), y: Math.round(b.y || 0), w: Math.round(b.width || 0), h: Math.round(b.height || 0) });
    }
  }
  out.pages.push({ page: page.name, frames });
}
return out;
