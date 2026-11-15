// Probe s446 bagian 3: tindak lanjut ide 61, 62, 63, 67, 68.
const byId = {};
for (const f of figma.currentPage.children) byId[f.id] = f;
const out = {};

// ---- 61b: semua node ber-stroke di Produk Game (1:208) ----
{
  const frame = byId["1:208"];
  const seen = {};
  frame.findAllWithCriteria({ types: ["FRAME", "RECT"] }).forEach((n) => {
    if (n.strokes && n.strokes.length) {
      const s = n.strokes[0];
      const key = (s.color ? [s.color.r, s.color.g, s.color.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : "?") + "|" + n.strokeWeight;
      seen[key] = (seen[key] || 0) + 1;
    }
  });
  out.strokeSummary = seen;
  // cari kartu nominal: node berisi teks "172 Diamonds" lalu naik ke parent
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.trim() === "172 Diamonds");
  out.nom172 = texts.map((t) => {
    let p = t.parent, chain = [];
    while (p && p !== frame && chain.length < 4) { chain.push({ name: p.name.slice(0, 30), type: p.type, strokeW: p.strokeWeight, stroke: p.strokes && p.strokes[0] ? p.strokes[0].color : null, fills: p.fills && p.fills[0] ? p.fills[0].color : null }); p = p.parent; }
    return chain;
  });
}

// ---- 62b: rect terbesar ber-fill gelap di frame modal ----
{
  out.veil2 = {};
  for (const [fid, label] of [["10:2", "sk"], ["162:2", "masuk"], ["170:2", "skDesk"]]) {
    const frame = byId[fid];
    const rects = frame.findAllWithCriteria({ types: ["RECT"] })
      .map((n) => ({ name: n.name.slice(0, 36), w: Math.round(n.width), h: Math.round(n.height), x: Math.round(n.x), y: Math.round(n.y),
        fill: n.fills && n.fills[0] && n.fills[0].color ? [n.fills[0].color.r, n.fills[0].color.g, n.fills[0].color.b].map((v) => +v.toFixed(2)).join(",") : null,
        fillOp: n.fills && n.fills[0] ? (n.fills[0].opacity == null ? 1 : +n.fills[0].opacity.toFixed(2)) : null,
        layerOp: +n.opacity.toFixed(2),
        effects: (n.effects || []).filter((e) => e.visible).map((e) => e.type + (e.radius ? ":" + e.radius : "")) }))
      .filter((r) => r.w > 300 && r.h > 300);
    rects.sort((a, b) => b.w * b.h - a.w * a.h);
    out.veil2[label] = rects.slice(0, 4);
  }
}

// ---- 63b: unit line-height yang dipakai di Beranda + Produk Game ----
{
  out.lhUnits = {};
  for (const [fid, label] of [["1:2", "beranda"], ["1:208", "game"]]) {
    const frame = byId[fid];
    const counts = {};
    const pxVals = {};
    frame.findAllWithCriteria({ types: ["TEXT"] }).forEach((t) => {
      const lh = t.lineHeight;
      if (!lh) { counts.none = (counts.none || 0) + 1; return; }
      const k = lh.unit + (lh.unit === "PIXELS" ? ":" + lh.value : lh.unit === "PERCENT" ? ":" + lh.value : "");
      counts[k] = (counts[k] || 0) + 1;
      if (lh.unit === "PIXELS") pxVals[lh.value] = (pxVals[lh.value] || 0) + 1;
      if (lh.unit === "PERCENT") {
        // hitung px efektif: fontSize * pct/100
        const eff = +(t.fontSize * lh.value / 100).toFixed(1);
        if (eff % 4 !== 0) pxVals["eff:" + eff] = (pxVals["eff:" + eff] || 0) + 1;
      }
    });
    out.lhUnits[label] = { counts, nonMult4: pxVals };
  }
}

// ---- 67b: gap antar seksi Beranda Desktop (20:2): bottom konten seksi -> heading berikut ----
{
  const frame = byId["20:2"];
  const fb = frame.absoluteBoundingBox;
  const heads = [];
  frame.findAllWithCriteria({ types: ["TEXT"] }).forEach((t) => {
    if (/^(Flash Sale|Top Up Game|Pulsa, Data|Kenapa Rosdi Store|Cara Top Up)$/.test(t.characters.trim())) {
      heads.push({ text: t.characters.trim().slice(0, 24), y: Math.round(t.absoluteBoundingBox.y - fb.y), h: Math.round(t.height) });
    }
  });
  heads.sort((a, b) => a.y - b.y);
  const gaps = [];
  for (let i = 0; i < heads.length - 1; i++) {
    const cur = heads[i], nxt = heads[i + 1];
    let bottom = cur.y + cur.h;
    frame.findAll().forEach((n) => {
      if (!n.absoluteBoundingBox) return;
      const ry = n.absoluteBoundingBox.y - fb.y;
      const rb = ry + n.height;
      if (ry >= cur.y && rb <= nxt.y && rb > bottom && n.type !== "TEXT") bottom = Math.round(rb);
    });
    gaps.push({ from: cur.text, to: nxt.text, gapPx: nxt.y - bottom, sectionBottom: bottom, nextHeadY: nxt.y });
  }
  out.gaps = gaps;
}

// ---- 68b: kartu modal: frame yang memuat teks judul modal ----
{
  out.modal2 = {};
  for (const [fid, label, titleRe] of [["10:2", "sk", /Syarat & Ketentuan/], ["13:2", "refund", /Kebijakan Pengembalian/], ["162:2", "masuk", /Masuk ke Rosdi Store/], ["170:2", "skDesk", /Syarat & Ketentuan/]]) {
    const frame = byId[fid];
    const t = frame.findAllWithCriteria({ types: ["TEXT"] }).find((x) => titleRe.test(x.characters));
    if (!t) { out.modal2[label] = "JUDUL TIDAK DITEMUKAN"; continue; }
    let p = t.parent, chain = [];
    while (p && p !== frame && chain.length < 3) {
      chain.push({ name: p.name.slice(0, 36), type: p.type, w: Math.round(p.width), h: Math.round(p.height), layoutMode: p.layoutMode, layoutWrap: p.layoutWrap || null, itemSpacing: p.itemSpacing, padding: p.paddingTop != null ? [p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft] : null });
      p = p.parent;
    }
    out.modal2[label] = chain;
  }
}
return out;
