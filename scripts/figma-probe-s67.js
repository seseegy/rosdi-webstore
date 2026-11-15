// Probe read-only Siklus 67:
// (1) sapuan seluruh file: semua TEXT yang mengandung "Admin sudah termasuk"
//     — untuk memutuskan temuan Siklus 66 (apakah teks itu salah vs kode);
// (2) struktur modal mobile S&K (10:2/10:105) + Refund (13:2/13:111) sesudah veil
//     — untuk varian desktop modal (pola Siklus 66);
// (3) batas bawah file (frame terbawah) — baris y kosong berikutnya.
const out = { admin: [], modals: {}, lowest: null };
let maxBottom = -1;
for (const f of figma.currentPage.children) {
  if (f.type !== "FRAME") continue;
  const b = f.absoluteBoundingBox;
  const bottom = Math.round(b.y + f.height);
  if (bottom > maxBottom) { maxBottom = bottom; out.lowest = { id: f.id, name: f.name, bottom }; }
  const hits = f.findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => (t.characters || "").indexOf("Admin sudah termasuk") >= 0);
  for (const t of hits) {
    out.admin.push({
      frame: f.id, frameName: f.name, node: t.id,
      chars: t.characters, w: Math.round(t.width), h: Math.round(t.height),
      fs: t.fontSize, x: Math.round(t.x), y: Math.round(t.y),
    });
  }
}
for (const fid of ["10:2", "10:105", "13:2", "13:111"]) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { out.modals[fid] = "NOT FOUND"; continue; }
  const kids = f.children.map((c) => {
    const bb = c.absoluteBoundingBox;
    const base = { id: c.id, name: c.name, type: c.type, x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(c.width), h: Math.round(c.height) };
    if (c.type === "TEXT") {
      base.chars = (c.characters || "").slice(0, 60);
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
  out.modals[fid] = { name: f.name, w: Math.round(f.width), h: Math.round(f.height), kids: f.children.length, veilIdx, afterVeil: kids.slice(Math.max(0, veilIdx)) };
}
return out;
