// Probe s446 bagian 5: koreksi tipe node (RECTANGLE bukan RECT) — ide 61, 62, 66, 68.
const byId = {};
for (const f of figma.currentPage.children) byId[f.id] = f;
const out = {};
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;

// ---- 61d: semua node ber-stroke biru di Produk Game (1:208) + geometri ----
{
  const frame = byId["1:208"];
  const blue = [];
  frame.findAll().forEach((n) => {
    if (n.strokes && n.strokes.length && n.strokes[0].color && hex(n.strokes[0].color).toLowerCase() === "#2563eb") {
      blue.push({ name: n.name.slice(0, 30), type: n.type, w: Math.round(n.width), h: Math.round(n.height), x: Math.round(n.absoluteBoundingBox.x - frame.absoluteBoundingBox.x), y: Math.round(n.absoluteBoundingBox.y - frame.absoluteBoundingBox.y), strokeW: +n.strokeWeight.toFixed(2), fill: n.fills && n.fills[0] ? hex(n.fills[0].color) : null });
    }
  });
  out.blueStrokes = blue;
  // fill kartu nominal: rect dengan fill #f8fafc (field) di frame
  const fields = [];
  frame.findAll().forEach((n) => {
    if (n.type === "RECTANGLE" && n.fills && n.fills[0] && n.fills[0].type === "SOLID" && hex(n.fills[0].color) === "#f8fafc") {
      fields.push({ w: Math.round(n.width), h: Math.round(n.height) });
    }
  });
  out.fieldRects = { count: fields.length, sample: fields.slice(0, 5) };
}

// ---- 62d: veil: rect/frame besar ber-fill gelap di frame modal ----
{
  out.veil4 = {};
  for (const [fid, label] of [["10:2", "sk"], ["162:2", "masuk"], ["170:2", "skDesk"], ["13:2", "refund"]]) {
    const frame = byId[fid];
    const cands = [];
    frame.findAll().forEach((n) => {
      if ((n.type === "RECTANGLE" || n.type === "FRAME") && n.width >= frame.width - 2 && n.height >= frame.height * 0.5) {
        const f0 = n.fills && n.fills[0];
        cands.push({ name: n.name.slice(0, 36), type: n.type, w: Math.round(n.width), h: Math.round(n.height),
          fill: f0 ? (f0.type + ":" + (f0.color ? hex(f0.color) : "?")) : null,
          fillOp: f0 ? (f0.opacity == null ? 1 : +f0.opacity.toFixed(2)) : null,
          layerOp: +n.opacity.toFixed(2),
          effects: (n.effects || []).filter((e) => e.visible).map((e) => e.type + (e.radius != null ? ":" + Math.round(e.radius) : "")) });
      }
    });
    out.veil4[label] = cands.slice(0, 4);
  }
}

// ---- 66b: fill opacity < 1 di SEMUA node (findAll, semua tipe) ----
{
  const hits = [];
  let scanned = 0;
  for (const f of figma.currentPage.children) {
    if (f.type !== "FRAME") continue;
    f.findAll().forEach((n) => {
      scanned++;
      (n.fills || []).forEach((fl) => {
        if (fl.type === "SOLID" && fl.opacity != null && fl.opacity < 1) {
          hits.push({ frame: f.name.slice(0, 28), node: n.name.slice(0, 30), type: n.type, fillOpacity: +fl.opacity.toFixed(2), layerOpacity: +n.opacity.toFixed(2) });
        }
      });
    });
  }
  out.fillOpacity2 = { scanned, count: hits.length, samples: hits.slice(0, 15) };
}

// ---- 68d: auto-layout di frame modal: node FRAME/COMPONENT dengan layoutMode != NONE ----
{
  out.autoLayout = {};
  for (const [fid, label] of [["10:2", "sk"], ["13:2", "refund"], ["162:2", "masuk"], ["170:2", "skDesk"]]) {
    const frame = byId[fid];
    const auto = [];
    let frames = 0;
    frame.findAll().forEach((n) => {
      if (n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE") {
        frames++;
        if (n.layoutMode && n.layoutMode !== "NONE") auto.push({ name: n.name.slice(0, 36), layoutMode: n.layoutMode, w: Math.round(n.width), h: Math.round(n.height) });
      }
    });
    // kartu modal: RECTANGLE radius>=14 lebar 300-400 tinggi 150-600
    const cards = [];
    frame.findAll().forEach((n) => {
      if (n.type === "RECTANGLE" && n.cornerRadius >= 14 && n.width >= 300 && n.width <= 400 && n.height >= 150 && n.height <= 700) {
        cards.push({ name: n.name.slice(0, 36), w: Math.round(n.width), h: Math.round(n.height), y: Math.round(n.absoluteBoundingBox.y - frame.absoluteBoundingBox.y), corner: n.cornerRadius, fill: n.fills && n.fills[0] ? hex(n.fills[0].color) : null });
      }
    });
    out.autoLayout[label] = { frameNodes: frames, autoCount: auto.length, auto, cards: cards.slice(0, 4) };
  }
}
return out;
