// Probe s446 bagian 4: tindak lanjut 61 (fill kartu terpilih), 62 (veil sbg FRAME), 68 (layoutMode).
const byId = {};
for (const f of figma.currentPage.children) byId[f.id] = f;
const out = {};
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;

// ---- 61c: kartu nominal terpilih di 1:208: rect ber-fill biru/soft-blue ----
{
  const frame = byId["1:208"];
  const fills = {};
  const blueish = [];
  frame.findAllWithCriteria({ types: ["RECT", "FRAME"] }).forEach((n) => {
    const f0 = n.fills && n.fills[0];
    if (f0 && f0.type === "SOLID" && f0.color) {
      const h = hex(f0.color);
      fills[h] = (fills[h] || 0) + 1;
      if (["#eff6ff", "#dbeafe", "#2563eb", "#1d4ed8"].includes(h.toLowerCase())) {
        blueish.push({ name: n.name.slice(0, 36), type: n.type, w: Math.round(n.width), h: Math.round(n.height), fill: h, strokeW: n.strokeWeight, corner: n.cornerRadius, layoutMode: n.layoutMode });
      }
    }
  });
  out.fillSummary = fills;
  out.blueish = blueish.slice(0, 10);
  // stroke di SEMUA tipe node (bukan cuma FRAME/RECT)
  const stroked = [];
  frame.findAll().forEach((n) => {
    if (n.strokes && n.strokes.length && n.strokes[0].color) {
      stroked.push({ name: n.name.slice(0, 30), type: n.type, hex: hex(n.strokes[0].color), w: n.strokeWeight });
    }
  });
  out.strokedAny = { count: stroked.length, samples: stroked.slice(0, 8) };
}

// ---- 62c: veil sebagai FRAME / node besar penutup di frame modal ----
{
  out.veil3 = {};
  for (const [fid, label] of [["10:2", "sk"], ["162:2", "masuk"], ["170:2", "skDesk"], ["13:2", "refund"]]) {
    const frame = byId[fid];
    const big = [];
    frame.findAll().forEach((n) => {
      if ((n.type === "FRAME" || n.type === "RECT") && n.width >= frame.width - 2 && n.height >= frame.height * 0.5) {
        const f0 = n.fills && n.fills[0];
        big.push({ name: n.name.slice(0, 36), type: n.type, w: Math.round(n.width), h: Math.round(n.height),
          fill: f0 ? (f0.type + ":" + (f0.color ? hex(f0.color) : "?")) : null,
          fillOp: f0 ? (f0.opacity == null ? 1 : +f0.opacity.toFixed(2)) : null,
          layerOp: +n.opacity.toFixed(2),
          effects: (n.effects || []).filter((e) => e.visible).map((e) => e.type + (e.radius != null ? ":" + Math.round(e.radius) : "")),
          layoutMode: n.layoutMode });
      }
    });
    out.veil3[label] = big.slice(0, 4);
  }
}

// ---- 68c: layoutMode di seluruh node frame modal ----
{
  out.layoutModes = {};
  for (const [fid, label] of [["10:2", "sk"], ["162:2", "masuk"], ["170:2", "skDesk"]]) {
    const frame = byId[fid];
    const counts = {};
    frame.findAll().forEach((n) => { if (n.layoutMode) counts[n.layoutMode] = (counts[n.layoutMode] || 0) + 1; });
    // kartu modal: rect ber-cornerRadius besar di tengah frame
    const cards = [];
    frame.findAllWithCriteria({ types: ["RECT"] }).forEach((n) => {
      if (n.cornerRadius >= 14 && n.width >= 300 && n.width <= 400 && n.height >= 150 && n.height <= 600) {
        cards.push({ name: n.name.slice(0, 36), w: Math.round(n.width), h: Math.round(n.height), y: Math.round(n.absoluteBoundingBox.y - frame.absoluteBoundingBox.y), corner: n.cornerRadius });
      }
    });
    out.layoutModes[label] = { counts, cards: cards.slice(0, 4) };
  }
}
return out;
