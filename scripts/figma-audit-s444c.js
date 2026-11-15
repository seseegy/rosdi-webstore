// Follow-up read-only s444c: koordinat kartu nominal ("Nom*") di frame
// Produk Game mobile Light — hitung gap horizontal/vertikal antar kartu.
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
const out = [];
for (const f of frames) {
  if (!/Produk Game \(6 Langkah\) — Light/.test(f.name)) continue;
  const noms = f.findAll((n) => /^Nom /.test(n.name) || n.name === "Nom").map((n) => {
    const b = n.absoluteBoundingBox;
    return { name: n.name.slice(0, 40), x: Math.round(b.x - f.absoluteBoundingBox.x), y: Math.round(b.y - f.absoluteBoundingBox.y), w: Math.round(b.width), h: Math.round(b.height) };
  });
  noms.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const rows = {};
  for (const k of noms) { const key = Math.round(k.y / 3); (rows[key] = rows[key] || []).push(k); }
  const rowList = Object.values(rows).map((r) => r.sort((a, b) => a.x - b.x));
  const hg = [], vg = [];
  for (const r of rowList) for (let i = 1; i < r.length; i++) hg.push(r[i].x - (r[i - 1].x + r[i - 1].w));
  const sRows = rowList.sort((a, b) => a[0].y - b[0].y);
  for (let i = 1; i < sRows.length; i++) vg.push(sRows[i][0].y - (sRows[i - 1][0].y + Math.max(...sRows[i - 1].map((c) => c.h))));
  out.push({ frame: f.name, nomCount: noms.length, colsPerRow: rowList.map((r) => r.length), hGaps: hg, vGaps: vg, firstRow: rowList[0] });
}
return { out };
