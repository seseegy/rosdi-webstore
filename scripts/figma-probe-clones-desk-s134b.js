// Probe read-only Siklus 134b: dump nama anak langsung frame modal desktop S&K
// (170:2) + Beranda Desktop (20:2) yang relevan grid/seksi — cari nama kartu
// desktop ("Card ...") dan header seksi.
const out = [];
for (const fid of ["170:2", "20:2"]) {
  const f = await figma.getNodeByIdAsync(fid);
  const kids = f.children.map((c) => ({
    id: c.id, name: c.name, type: c.type,
    x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height),
  }));
  const cards = kids.filter((k) => (k.name || "").indexOf("Card ") === 0);
  const headers = kids.filter((k) => k.type === "TEXT" && (
    (k.name || "").indexOf("Top") === 0 || (k.name || "").indexOf("Pulsa") === 0 ||
    (k.name || "").indexOf("Kenapa") === 0 || (k.name || "").indexOf("Cara") === 0 ||
    (k.name || "").indexOf("Flash") === 0));
  const veil = kids.find((k) => k.name === "Veil");
  // Nama unik semua TEXT di y 700..1150 (area grid + header seksi bawah grid)
  const mid = kids.filter((k) => k.type === "TEXT" && k.y >= 700 && k.y < 1200)
    .map((k) => ({ name: k.name, y: k.y }));
  out.push({ id: fid, name: f.name, frameH: Math.round(f.height), kids: kids.length, veil, cards, headers, mid });
}
return out;
