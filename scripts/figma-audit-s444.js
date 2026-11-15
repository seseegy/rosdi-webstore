// Audit read-only s444 (ide 61-70, 95, 99): nama frame, duplikat, node yatim,
// pasangan Light/Dark, font, warna di luar token, clip content, radius,
// gap grid nominal, "Rp " ber-spasi, "Mulai Rp", klaim superlatif.
// Semua agregasi dihitung di dalam plugin agar return tetap kecil.
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
const frameList = [];
const byName = {};
for (const f of frames) {
  const all = f.findAll(() => true);
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const rec = [f.id, f.name, Math.round(f.x), Math.round(f.y), Math.round(f.width), Math.round(f.height), all.length, f.children.length, texts.length, f.clipsContent];
  frameList.push(rec);
  byName[f.name] = { frame: f, rec, all, texts };
}
// ide 61/62: pola nama + duplikat
const nameCount = {};
for (const f of frames) nameCount[f.name] = (nameCount[f.name] || 0) + 1;
const duplicates = Object.entries(nameCount).filter(([, c]) => c > 1).map(([n, c]) => n + " x" + c);
const noThemeSuffix = frames.filter((f) => !/ — (Light|Dark)$/.test(f.name)).map((f) => f.name);
const noVariant = frames.filter((f) => (f.name.match(/ — /g) || []).length < 2).map((f) => f.name);
// ide 63: node yatim di luar frame (anak page yang bukan FRAME)
const orphans = figma.currentPage.children.filter((n) => n.type !== "FRAME").map((n) => n.type + ":" + n.name);
// ide 64: dimensi pasangan
function baseName(n) { return n.replace(/ — (Light|Dark)$/, ""); }
function themeOf(n) { const m = n.match(/ — (Light|Dark)$/); return m ? m[1] : null; }
const pairs = [];
const seen = new Set();
for (const f of frames) {
  const base = baseName(f.name), th = themeOf(f.name);
  if (!th || seen.has(base)) continue;
  const L = byName[base + " — Light"], D = byName[base + " — Dark"];
  if (!L || !D) continue;
  seen.add(base);
  pairs.push({ base, lw: L.rec[4], lh: L.rec[5], dw: D.rec[4], dh: D.rec[5], dimDiff: (L.rec[4] !== D.rec[4] || L.rec[5] !== D.rec[5]) });
}
// ide 65/66/67/68/70/95/99: sapu semua node teks + warna + radius + clip
const ALLOWED = new Set([
  // token Light/Dark (batch) + turunan CSS
  "#f6f8fb", "#ffffff", "#0f172a", "#64748b", "#94a3b8", "#e2e8f0", "#2563eb", "#eff6ff", "#f8fafc", "#059669",
  "#0b1220", "#131f36", "#f1f5f9", "#22314f", "#3b82f6", "#16294d", "#0e1930", "#34d399",
  "#5b6b82", "#9db0c9", "#60a5fa", "#1d4ed8", "#1e3a8a", "#dbeafe", "#047857", "#ecfdf5", "#dc2626", "#fef2f2",
  "#b45309", "#fffbeb", "#c7d7fb", "#eef2f7", "#172f5e", "#0c2b21", "#f87171", "#33161a", "#fbbf24", "#2e230a",
  // warna tile game/operator/e-wallet/voucher/tagihan dari data.js + CATEGORY_COLORS
  "#0284c7", "#0f766e", "#334155", "#475569", "#7c3aed", "#be185d", "#4c1d95", "#c2410c", "#000000",
]);
const toHex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const fonts = {};
const colorCount = {};
const colorFrames = {};
const radiusDist = {};
const clipsOff = [];
const rpSpace = [];
const mulaiRp = [];
const superlatif = [];
let totalNodes = 0, totalTexts = 0;
for (const f of frames) {
  const all = byName[f.name].all;
  const texts = byName[f.name].texts;
  totalNodes += all.length;
  totalTexts += texts.length;
  if (f.clipsContent === false) clipsOff.push(f.name);
  for (const n of all) {
    if (typeof n.cornerRadius === "number" && n.cornerRadius > 0) {
      const k = String(n.cornerRadius);
      radiusDist[k] = (radiusDist[k] || 0) + 1;
    }
    for (const kind of ["fills", "strokes"]) {
      const paints = n[kind];
      if (!Array.isArray(paints)) continue;
      for (const p of paints) {
        if (!p || p.type !== "SOLID" || p.visible === false || !p.color) continue;
        const h = toHex(p.color);
        colorCount[h] = (colorCount[h] || 0) + 1;
        if (!colorFrames[h]) colorFrames[h] = f.name;
      }
    }
  }
  for (const t of texts) {
    try {
      const fam = t.fontName && t.fontName.family;
      if (fam) fonts[fam] = (fonts[fam] || 0) + 1;
    } catch { /* abaikan */ }
    const s = t.characters || "";
    if (/Rp\s+\d/.test(s)) rpSpace.push(f.name + " :: " + s.slice(0, 60));
    if (/Mulai Rp/.test(s)) mulaiRp.push(f.name + " :: " + s.slice(0, 60));
    if (/termurah|tercepat|terbaik|paling murah|paling cepat/i.test(s)) superlatif.push(f.name + " :: " + s.slice(0, 60));
  }
}
const offToken = Object.entries(colorCount)
  .filter(([h]) => !ALLOWED.has(h.toLowerCase()))
  .map(([h, c]) => ({ hex: h, count: c, sampleFrame: colorFrames[h] }))
  .sort((a, b) => b.count - a.count);
// ide 69: gap grid nominal — cari parent dengan >=4 anak tersusun baris
const mode = (arr) => {
  const m = {};
  for (const v of arr) m[v] = (m[v] || 0) + 1;
  let best = null, bn = 0;
  for (const k of Object.keys(m)) if (m[k] > bn) { bn = m[k]; best = k; }
  return best === null ? null : { value: Number(best), n: bn };
};
const grids = [];
for (const f of frames) {
  const hg = [], vg = [];
  for (const n of byName[f.name].all) {
    if (!n.children || n.children.length < 4) continue;
    const kids = n.children.filter((c) => c.visible !== false);
    if (kids.length < 4) continue;
    const rows = {};
    for (const c of kids) {
      const k = Math.round(c.y / 3);
      (rows[k] = rows[k] || []).push(c);
    }
    const rowList = Object.values(rows).filter((r) => r.length >= 2).map((r) => r.sort((a, b) => a.x - b.x));
    if (rowList.length < 2) continue;
    for (const r of rowList) for (let i = 1; i < r.length; i++) hg.push(Math.round(r[i].x - (r[i - 1].x + r[i - 1].width)));
    const sortedRows = rowList.sort((a, b) => a[0].y - b[0].y);
    for (let i = 1; i < sortedRows.length; i++) {
      const prev = sortedRows[i - 1], cur = sortedRows[i];
      const prevH = Math.max(...prev.map((c) => c.height));
      vg.push(Math.round(cur[0].y - (prev[0].y + prevH)));
    }
  }
  const mh = mode(hg), mv = mode(vg);
  if (mh || mv) grids.push({ frame: f.name, hGap: mh, vGap: mv, hSamples: hg.length, vSamples: vg.length });
}
const dimMismatch = pairs.filter((p) => p.dimDiff);
return {
  frameCount: frames.length, totalNodes, totalTexts,
  frameList, duplicates, noThemeSuffix, noVariant, orphans,
  pairCount: pairs.length, dimMismatch,
  fonts, offToken, offTokenCount: offToken.length,
  clipsOff, clipsOffCount: clipsOff.length,
  radiusDist, grids,
  rpSpace: { count: rpSpace.length, samples: rpSpace.slice(0, 10) },
  mulaiRp,
  superlatif: { count: superlatif.length, samples: superlatif.slice(0, 10) },
};
