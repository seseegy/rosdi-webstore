// Read-only audit s443 (Figma): ide 50, 81-90, 95-97 — header/footer height,
// tile colors vs data.js, step numbering, input border, modal radius,
// flash badge position, was/final geometry, generic names, clipContent,
// step-title & nominal-price font sizes, faint vs sub fills, search-mlbb count.
const out = {};
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
out.frameCount = frames.length;
out.frameNames = frames.length;

const hex = (fills) => {
  if (!fills || !fills.length) return null;
  const s = fills.find((x) => x.type === "SOLID" && x.visible !== false);
  if (!s) return null;
  const c = s.color;
  const r = Math.round(c.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(c.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(c.b * 255).toString(16).padStart(2, "0");
  return "#" + r + g + b;
};
const all = (f) => f.findAll(() => true);

// 81/82: header & footer heights per frame
out.headers = {}; out.footers = {};
for (const f of frames) {
  for (const n of all(f)) {
    if (/header/i.test(n.name || "")) { const k = Math.round(n.height) + "x" + Math.round(n.width); out.headers[k] = (out.headers[k] || 0) + 1; }
    if (/footer/i.test(n.name || "")) { const k = Math.round(n.height) + "x" + Math.round(n.width); out.footers[k] = (out.footers[k] || 0) + 1; }
  }
}

// 83: tile 46x46 (CSS .tile) — fill + text inside
out.tiles = {};
for (const f of frames) {
  for (const n of all(f)) {
    if ((n.type === "RECTANGLE" || n.type === "FRAME") && Math.round(n.width) === 46 && Math.round(n.height) === 46) {
      let txt = null;
      if (n.type === "FRAME") {
        const t = n.findAll((x) => x.type === "TEXT")[0];
        if (t) txt = t.characters;
      } else {
        // rectangle tile: cari text yang tumpang tindih (pusat sama)
        const cx = n.absoluteTransform[0][2] + 23, cy = n.absoluteTransform[1][2] + 23;
        const t = all(f).find((x) => x.type === "TEXT" && Math.abs(x.absoluteTransform[0][2] + x.width / 2 - cx) < 24 && Math.abs(x.absoluteTransform[1][2] + x.height / 2 - cy) < 24);
        if (t) txt = t.characters;
      }
      const k = (txt || "?") + "|" + hex(n.fills) + "|" + n.cornerRadius;
      out.tiles[k] = (out.tiles[k] || 0) + 1;
    }
  }
}

// 84 + 95: step titles "N. ..." per frame + font size
out.steps = []; out.stepTitleSizes = {};
for (const f of frames) {
  const seq = [];
  for (const n of all(f)) {
    if (n.type === "TEXT" && /^\d\.\s/.test(n.characters || "")) {
      seq.push({ num: parseInt(n.characters, 10), text: n.characters.slice(0, 40), size: n.fontSize });
      const k = String(n.fontSize);
      out.stepTitleSizes[k] = (out.stepTitleSizes[k] || 0) + 1;
    }
  }
  if (seq.length) out.steps.push({ frame: f.name, seq: seq.map((s) => s.num), titles: seq.map((s) => s.text) });
}

// 85: input border strokes — node bernama input/field/cari atau rect dengan stroke
out.inputBorders = {};
for (const f of frames) {
  for (const n of all(f)) {
    if (/input|field|cari produk|search/i.test(n.name || "") && n.strokes && n.strokes.length) {
      const k = hex(n.strokes); out.inputBorders[k] = (out.inputBorders[k] || 0) + 1;
    }
  }
}

// 86: modal radii — kartu modal di frame Modal (node FRAME/RECTANGLE terbesar di tengah)
out.modalRadii = {};
for (const f of frames) {
  if (!/modal/i.test(f.name)) continue;
  const kids = (f.children || []).filter((n) => n.type === "FRAME" || n.type === "RECTANGLE");
  for (const k of kids) {
    const kk = String(k.cornerRadius) + "|" + Math.round(k.width) + "x" + Math.round(k.height);
    out.modalRadii[kk] = (out.modalRadii[kk] || 0) + 1;
  }
}

// 87: badge "-10%" / "-5%" di kartu flash Beranda — posisi relatif ke frame
out.flashBadges = [];
for (const f of frames) {
  if (!/beranda/i.test(f.name)) continue;
  for (const n of all(f)) {
    if (n.type === "TEXT" && /^-\d+%$/.test((n.characters || "").trim())) {
      out.flashBadges.push({ frame: f.name, text: n.characters, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height), absX: Math.round(n.absoluteTransform[0][2]), absY: Math.round(n.absoluteTransform[1][2]) });
    }
  }
}

// 88: harga coret (strikethrough) vs harga final di kartu nominal
out.wasGeom = [];
for (const f of frames) {
  if (/beranda/i.test(f.name) && !/produk|pulsa|pln|voucher|e-wallet|emoney/i.test(f.name)) continue;
  for (const n of all(f)) {
    if (n.type === "TEXT" && n.textDecoration === "STRIKETHROUGH") {
      if (out.wasGeom.length < 12) out.wasGeom.push({ frame: f.name, text: n.characters, x: Math.round(n.x), y: Math.round(n.y), size: n.fontSize });
    }
  }
}
out.wasCount = out.wasGeom.length;

// 89: nama layer generik di seluruh file
out.genericNames = { Frame: 0, Group: 0, Rectangle: 0, Text: 0 };
for (const f of frames) {
  for (const n of all(f)) {
    const nm = n.name || "";
    if (nm === "Frame" || nm === "Group" || nm === "Rectangle" || nm === "Text") out.genericNames[nm]++;
  }
}

// 90: clipContent frame utama
out.clip = { clipped: 0, notClipped: [] };
for (const f of frames) { if (f.clipsContent) out.clip.clipped++; else if (out.clip.notClipped.length < 20) out.clip.notClipped.push(f.name); }

// 96: font harga nominal — teks "Rp..." di frame produk
out.nominalPriceSizes = {};
for (const f of frames) {
  for (const n of all(f)) {
    if (n.type === "TEXT" && /^Rp[\d.]+$/.test((n.characters || "").trim())) {
      const k = String(n.fontSize);
      out.nominalPriceSizes[k] = (out.nominalPriceSizes[k] || 0) + 1;
    }
  }
}

// 97: fill teks faint (#94A3B8) vs sub (#64748B) vs sub-kode (#5B6B82)
out.textFills = {};
for (const f of frames) {
  for (const n of all(f)) {
    if (n.type === "TEXT") {
      const h = hex(n.fills);
      if (h === "#94a3b8" || h === "#64748b" || h === "#5b6b82") {
        out.textFills[h] = (out.textFills[h] || 0) + 1;
      }
    }
  }
}

// 50: frame pencarian mlbb — semua teks (cari hitungan hasil)
out.searchMlbb = [];
for (const f of frames) {
  if (/pencarian/i.test(f.name)) {
    const ts = all(f).filter((n) => n.type === "TEXT").map((n) => n.characters);
    out.searchMlbb.push({ frame: f.name, nText: ts.length, hasCount: ts.some((t) => /hasil/i.test(t)), countTexts: ts.filter((t) => /hasil|tidak ada|ditemukan/i.test(t)), sample: ts.slice(0, 12) });
  }
}
return out;
