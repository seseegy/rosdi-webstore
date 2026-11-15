// Follow-up read-only s444b: (67) node yang meluber keluar batas frame,
// (68) radius node bernama kartu/modal/step/ringkasan, (69) gap grid nominal
// di frame Produk Game.
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
// 67: overflow nyata — descendant yang absoluteBoundingBox-nya keluar frame
const overflow = [];
for (const f of frames) {
  const fb = f.absoluteBoundingBox;
  if (!fb) continue;
  for (const n of f.findAll(() => true)) {
    const b = n.absoluteBoundingBox;
    if (!b) continue;
    const dx = Math.max(fb.x - b.x, (b.x + b.width) - (fb.x + fb.width), 0);
    const dy = Math.max(fb.y - b.y, (b.y + b.height) - (fb.y + fb.height), 0);
    if (dx > 0.5 || dy > 0.5) {
      overflow.push({ frame: f.name, node: n.type + ":" + n.name.slice(0, 50), overX: Math.round(dx), overY: Math.round(dy) });
    }
  }
}
// 68: radius pada node yang namanya kartu/modal/step/ringkasan/nominal
const cardRadius = {};
const cardRadiusSamples = {};
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    if (!/card|kartu|modal|step|ringkas|summary|nom/i.test(n.name)) continue;
    if (typeof n.cornerRadius === "number" && n.cornerRadius > 0) {
      const k = String(n.cornerRadius);
      cardRadius[k] = (cardRadius[k] || 0) + 1;
      if (!cardRadiusSamples[k]) cardRadiusSamples[k] = f.name + " :: " + n.name.slice(0, 50);
    }
  }
}
// 69: grid nominal di frame Produk Game (mobile Light/Dark + Desktop)
const grids = [];
const target = frames.filter((f) => /Produk Game/.test(f.name));
for (const f of target) {
  // cari parent dengan anak terbanyak (grid nominal)
  let best = null;
  for (const n of f.findAll(() => true)) {
    if (n.children && n.children.length >= 6 && (!best || n.children.length > best.children.length)) best = n;
  }
  if (!best) { grids.push({ frame: f.name, note: "tidak ada parent >=6 anak" }); continue; }
  const kids = best.children.filter((c) => c.visible !== false).map((c) => ({ x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height), name: c.name.slice(0, 30) }));
  kids.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const rows = {};
  for (const k of kids) { const key = Math.round(k.y / 3); (rows[key] = rows[key] || []).push(k); }
  const rowList = Object.values(rows).map((r) => r.sort((a, b) => a.x - b.x));
  const hg = [], vg = [];
  for (const r of rowList) for (let i = 1; i < r.length; i++) hg.push(r[i].x - (r[i - 1].x + r[i - 1].w));
  const sRows = rowList.sort((a, b) => a[0].y - b[0].y);
  for (let i = 1; i < sRows.length; i++) vg.push(sRows[i][0].y - (sRows[i - 1][0].y + Math.max(...sRows[i - 1].map((c) => c.h))));
  const mode = (arr) => { const m = {}; for (const v of arr) m[v] = (m[v] || 0) + 1; let bk = null, bn = 0; for (const k of Object.keys(m)) if (m[k] > bn) { bn = m[k]; bk = k; } return bk === null ? null : { value: Number(bk), n: bn, total: arr.length }; };
  grids.push({ frame: f.name, gridParent: best.type + ":" + best.name.slice(0, 60), childCount: kids.length, colsPerRow: rowList.map((r) => r.length), hGap: mode(hg), vGap: mode(vg), firstKids: kids.slice(0, 4) });
}
return { overflowCount: overflow.length, overflow: overflow.slice(0, 15), cardRadius, cardRadiusSamples, grids };
