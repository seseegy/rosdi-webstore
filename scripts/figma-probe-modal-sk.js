// Probe read-only: struktur frame Modal S&K Light (10:2) + Dark (10:105) —
// simpul veil, kartu modal, judul, isi, tombol — untuk diklon jadi Modal Masuk (Siklus 65).
const out = {};
for (const fid of ["10:2", "10:105"]) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { out[fid] = "NOT FOUND"; continue; }
  const kids = f.children.map((c) => {
    const b = c.absoluteBoundingBox;
    const base = { id: c.id, name: c.name, type: c.type, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    if (c.type === "TEXT") base.chars = (c.characters || "").slice(0, 60);
    if (c.type === "RECTANGLE" || c.type === "FRAME") {
      const fills = (c.fills || []).map((p) => p.type === "SOLID" ? { r: +p.color.r.toFixed(2), g: +p.color.g.toFixed(2), b: +p.color.b.toFixed(2), op: p.opacity } : { t: p.type });
      base.fills = fills;
      if (c.cornerRadius !== undefined) base.r = c.cornerRadius;
      if (c.strokes && c.strokes.length) base.stroke = c.strokes.map((p) => p.type === "SOLID" ? { r: +p.color.r.toFixed(2), g: +p.color.g.toFixed(2), b: +p.color.b.toFixed(2) } : { t: p.type });
    }
    return base;
  });
  // Hanya simpul veil + kartu modal dan isinya (anak setelah veil): laporkan indeks veil + semua anak setelahnya.
  const veilIdx = kids.findIndex((k) => k.name === "Veil");
  out[fid] = { frame: { name: f.name, w: f.width, h: f.height }, veilIdx, total: kids.length, afterVeil: kids.slice(Math.max(0, veilIdx)) };
}
return out;
