// Probe s446 bagian 2: ide 61-69 + 85 (Figma read-only).
const byId = {};
for (const f of figma.currentPage.children) byId[f.id] = f;
const out = {};

// ---- 61: border kartu nominal terpilih di frame Produk Game (1:208) ----
{
  const frame = byId["1:208"];
  const strokes = [];
  frame.findAllWithCriteria({ types: ["FRAME", "RECT", "COMPONENT", "INSTANCE"] }).forEach((n) => {
    if (n.strokes && n.strokes.length && n.strokes[0].color) {
      const c = n.strokes[0].color;
      const hex = "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
      if (hex.toLowerCase() === "#2563eb" || hex.toLowerCase() === "#3b82f6") {
        strokes.push({ name: n.name.slice(0, 40), type: n.type, w: Math.round(n.width), h: Math.round(n.height), strokeWeight: n.strokeWeight, hex, strokeAlign: n.strokeAlign || null });
      }
    }
  });
  out.selBorder = strokes.slice(0, 12);
  out.selBorderCount = strokes.length;
}

// ---- 62: veil modal (10:2 S&K, 162:2 Masuk) ----
{
  out.veil = {};
  for (const [fid, label] of [["10:2", "sk"], ["162:2", "masuk"], ["170:2", "skDesk"]]) {
    const frame = byId[fid];
    const hits = [];
    frame.findAllWithCriteria({ types: ["RECT", "FRAME"] }).forEach((n) => {
      const isVeil = /veil|overlay|backdrop|screm|gelap/i.test(n.name) || (n.width >= frame.width - 2 && n.height >= frame.height - 2 && n.y <= 2 && n.type === "RECT");
      if (!isVeil) return;
      const f0 = n.fills && n.fills[0];
      hits.push({ name: n.name.slice(0, 40), w: Math.round(n.width), h: Math.round(n.height),
        fillOpacity: f0 ? (f0.opacity == null ? 1 : +f0.opacity.toFixed(2)) : null,
        layerOpacity: +n.opacity.toFixed(2),
        fillType: f0 ? f0.type : null,
        effects: (n.effects || []).map((e) => ({ type: e.type, radius: e.radius, visible: e.visible })),
        blend: n.blendMode });
    });
    out.veil[label] = hits.slice(0, 4);
  }
}

// ---- 63: line-height teks di Beranda (1:2) + Produk Game (1:208) bukan kelipatan 4 ----
{
  out.lineHeight = {};
  for (const [fid, label] of [["1:2", "beranda"], ["1:208", "game"]]) {
    const frame = byId[fid];
    const bad = {};
    frame.findAllWithCriteria({ types: ["TEXT"] }).forEach((t) => {
      const lh = t.lineHeight;
      if (lh && lh.unit === "PIXELS") {
        const v = +lh.value.toFixed(1);
        if (v % 4 !== 0) bad[v] = (bad[v] || 0) + 1;
      }
    });
    out.lineHeight[label] = bad;
  }
}

// ---- 64: teks ALL-CAPS di Beranda + Produk Game ----
{
  out.caps = {};
  for (const [fid, label] of [["1:2", "beranda"], ["1:208", "game"]]) {
    const frame = byId[fid];
    const items = [];
    frame.findAllWithCriteria({ types: ["TEXT"] }).forEach((t) => {
      const s = t.characters.trim();
      if (s.length >= 3 && s === s.toUpperCase() && /[A-Z]/.test(s) && !/^\d/.test(s)) items.push(s.slice(0, 40));
    });
    out.caps[label] = { count: items.length, samples: items.slice(0, 15) };
  }
}

// ---- 65: textAlign harga di aside ringkasan desktop produk (26:2, 84:2) ----
{
  out.summaryAlign = {};
  for (const [fid, label] of [["26:2", "gameDesk"], ["28:2", "pulsaDesk"], ["33:2", "voucherDesk"]]) {
    const frame = byId[fid];
    const rows = [];
    frame.findAllWithCriteria({ types: ["TEXT"] }).forEach((t) => {
      const b = t.absoluteBoundingBox;
      if (b.x - frame.absoluteBoundingBox.x > 760 && /Rp[\d.]+/.test(t.characters)) {
        rows.push({ text: t.characters.slice(0, 30), align: t.textAlignHorizontal, x: Math.round(b.x - frame.absoluteBoundingBox.x), w: Math.round(t.width) });
      }
    });
    out.summaryAlign[label] = rows.slice(0, 14);
  }
}

// ---- 66: node dengan fill opacity < 1 (bukan opacity layer) ----
{
  const hits = [];
  let scanned = 0;
  for (const f of figma.currentPage.children) {
    if (f.type !== "FRAME") continue;
    f.findAllWithCriteria({ types: ["RECT", "FRAME", "ELLIPSE", "TEXT"] }).forEach((n) => {
      scanned++;
      (n.fills || []).forEach((fl) => {
        if (fl.type === "SOLID" && fl.opacity != null && fl.opacity < 1) {
          hits.push({ frame: f.name.slice(0, 28), node: n.name.slice(0, 30), fillOpacity: +fl.opacity.toFixed(2), layerOpacity: +n.opacity.toFixed(2) });
        }
      });
    });
  }
  out.fillOpacity = { scanned, count: hits.length, samples: hits.slice(0, 15) };
}

// ---- 67: gap vertikal antar seksi Beranda Desktop (20:2) ----
{
  const frame = byId["20:2"];
  const heads = [];
  frame.findAllWithCriteria({ types: ["TEXT"] }).forEach((t) => {
    if (/^(Flash Sale|Top Up Game|Pulsa|Kenapa Rosdi Store|Cara Top Up)/.test(t.characters.trim())) {
      heads.push({ text: t.characters.trim().slice(0, 30), y: Math.round(t.absoluteBoundingBox.y - frame.absoluteBoundingBox.y), h: Math.round(t.height) });
    }
  });
  heads.sort((a, b) => a.y - b.y);
  out.deskGaps = heads;
}

// ---- 68: auto-layout kartu modal (10:2, 13:2, 162:2, 170:2) ----
{
  out.modalLayout = {};
  for (const [fid, label] of [["10:2", "sk"], ["13:2", "refund"], ["162:2", "masuk"], ["170:2", "skDesk"]]) {
    const frame = byId[fid];
    const cands = [];
    frame.findAllWithCriteria({ types: ["FRAME"] }).forEach((n) => {
      if (/modal|card|dialog|masuk/i.test(n.name) && n.width > 200 && n.width < 600) {
        cands.push({ name: n.name.slice(0, 40), w: Math.round(n.width), h: Math.round(n.height), layoutMode: n.layoutMode, layoutWrap: n.layoutWrap || null, itemSpacing: n.itemSpacing });
      }
    });
    out.modalLayout[label] = cands.slice(0, 4);
  }
}

// ---- 69: jumlah node teks per frame ----
{
  const counts = [];
  for (const f of figma.currentPage.children) {
    if (f.type !== "FRAME") continue;
    const n = f.findAllWithCriteria({ types: ["TEXT"] }).length;
    counts.push({ frame: f.name.slice(0, 40), texts: n, total: f.findAll().length });
  }
  counts.sort((a, b) => b.texts - a.texts);
  out.textCounts = { top: counts.slice(0, 8), max: counts[0], min: counts[counts.length - 1] };
}

// ---- 85: harga Steam 45rb di frame Steam (100:2 + 100:232) ----
{
  out.steam = {};
  for (const [fid, label] of [["100:2", "steamMob"], ["100:232", "steamDesk"]]) {
    const frame = byId[fid];
    const texts = frame.findAllWithCriteria({ types: ["TEXT"] })
      .filter((t) => /45\.?000|47\.?250|47\.?300/.test(t.characters))
      .map((t) => t.characters.slice(0, 50));
    out.steam[label] = texts.slice(0, 12);
  }
}
return out;
