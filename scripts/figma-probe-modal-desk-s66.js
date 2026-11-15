// Probe read-only: struktur frame Modal Masuk Light (162:2) + Dark (162:111)
// (veil, kartu, judul, isi, tombol) + batas frame Beranda Desktop (20:2/21:2)
// dan frame terbawah file — untuk varian desktop Modal Masuk (Siklus 66).
const out = {};
for (const fid of ["162:2", "162:111", "20:2", "21:2"]) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { out[fid] = "NOT FOUND"; continue; }
  const b = f.absoluteBoundingBox;
  const info = { name: f.name, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(f.width), h: Math.round(f.height), kids: f.children.length };
  if (fid.startsWith("162:")) {
    const kids = f.children.map((c) => {
      const bb = c.absoluteBoundingBox;
      const base = { id: c.id, name: c.name, type: c.type, x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(c.width), h: Math.round(c.height) };
      if (c.type === "TEXT") {
        base.chars = (c.characters || "").slice(0, 50);
        base.fs = c.fontSize;
        base.fills = (c.fills || []).map((p) => p.type === "SOLID" ? { r: +p.color.r.toFixed(2), g: +p.color.g.toFixed(2), b: +p.color.b.toFixed(2) } : { t: p.type });
      }
      if (c.type === "RECTANGLE" || c.type === "FRAME") {
        base.fills = (c.fills || []).map((p) => p.type === "SOLID" ? { r: +p.color.r.toFixed(2), g: +p.color.g.toFixed(2), b: +p.color.b.toFixed(2), op: p.opacity } : { t: p.type });
        if (c.cornerRadius !== undefined) base.r = c.cornerRadius;
        if (c.strokes && c.strokes.length) base.stroke = c.strokes.map((p) => p.type === "SOLID" ? { r: +p.color.r.toFixed(2), g: +p.color.g.toFixed(2), b: +p.color.b.toFixed(2) } : { t: p.type });
        if (c.strokeWeight !== undefined) base.sw = c.strokeWeight;
      }
      return base;
    });
    const veilIdx = kids.findIndex((k) => k.name === "Veil");
    info.veilIdx = veilIdx;
    info.afterVeil = kids.slice(Math.max(0, veilIdx));
  }
  out[fid] = info;
}
return out;
