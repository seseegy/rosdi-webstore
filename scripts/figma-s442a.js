// Read-only audit s442 (Figma): ide 81-90 — hidden/locked, nama frame sisa,
// urutan layer vs y, constraints mobile, padding modal, radius, chip, glif, divider.
const out = {};
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
out.frameCount = frames.length;

// 81: node tersembunyi
out.hidden = [];
// 82: node terkunci
out.locked = [];
// 83: frame Copy/Old/Backup/Draft
out.suspectNames = frames.filter((f) => /copy|old|backup|draft|salin|cadangan|test|coba/i.test(f.name))
  .map((f) => ({ name: f.name, x: Math.round(f.x), y: Math.round(f.y) }));
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    if (n.visible === false && out.hidden.length < 20) out.hidden.push({ frame: f.name, type: n.type, name: (n.name || "").slice(0, 70) });
    if (n.locked && out.locked.length < 20) out.locked.push({ frame: f.name, type: n.type, name: (n.name || "").slice(0, 70) });
  }
}
out.hiddenCount = 0; out.lockedCount = 0;
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    if (n.visible === false) out.hiddenCount++;
    if (n.locked) out.lockedCount++;
  }
}
// 84: urutan layer panel vs y (frames sudah diurutkan by y; bandingkan urutan asli)
const rawOrder = [];
for (const p of figma.root.children) for (const n of p.children) if (n.type === "FRAME") rawOrder.push(n.name);
const sortedNames = frames.map((f) => f.name);
out.layerOrderMatchesY = JSON.stringify(rawOrder) === JSON.stringify(sortedNames);
out.rawOrderFirst10 = rawOrder.slice(0, 10);
out.sortedFirst10 = sortedNames.slice(0, 10);

// helper: cari frame by pola nama
const findFrame = (re) => frames.find((f) => re.test(f.name));
const berandaMobile = findFrame(/beranda/i) && frames.filter((f) => /beranda/i.test(f.name) && f.width <= 400)[0];
out.berandaMobile = berandaMobile ? { name: berandaMobile.name, w: Math.round(berandaMobile.width), h: Math.round(berandaMobile.height) } : null;

// 85: constraints kartu/field di frame Beranda mobile
out.constraints = [];
if (berandaMobile) {
  const all = berandaMobile.findAll(() => true);
  // kartu pertama (frame/rect dengan anak teks nama game) + field pencarian
  const cards = all.filter((n) => n.type === "FRAME" && n.children && n.children.length >= 2).slice(0, 4);
  for (const c of cards) {
    out.constraints.push({ kind: "card?", name: (c.name || "").slice(0, 50), w: Math.round(c.width), constraints: c.constraints || null, layoutMode: c.layoutMode || null });
  }
  const inputs = all.filter((n) => /cari|search|input|field/i.test(n.name || "")).slice(0, 4);
  for (const n of inputs) out.constraints.push({ kind: "input?", name: (n.name || "").slice(0, 50), w: Math.round(n.width), constraints: n.constraints || null });
}

// 86: padding kartu modal S&K/Refund/Masuk Light+Dark
out.modalPadding = [];
for (const f of frames) {
  if (/S&K|Refund|Masuk|Modal/i.test(f.name)) {
    const cards = f.findAll((n) => n.type === "FRAME" && (n.paddingLeft !== undefined));
    for (const c of cards.slice(0, 3)) {
      out.modalPadding.push({ frame: f.name, node: (c.name || "").slice(0, 50), w: Math.round(c.width), h: Math.round(c.height), pad: [c.paddingLeft, c.paddingTop, c.paddingRight, c.paddingBottom] });
    }
  }
}

// 87: radius input, tombol Beli, chip, badge
const radii = {};
const collectRadius = (node, label) => {
  const r = node.cornerRadius;
  if (typeof r === "number") { radii[label] = radii[label] || {}; radii[label][r] = (radii[label][r] || 0) + 1; }
};
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    const nm = (n.name || "").toLowerCase();
    if (/beli sekarang/.test(nm)) collectRadius(n, "tombolBeli");
    if (/masuk/.test(nm) && n.type !== "TEXT") collectRadius(n, "tombolMasuk");
    if (/chip|kategori/.test(nm)) collectRadius(n, "chip");
    if (/badge|diskon|flash|-10%|-5%|terlaris/.test(nm)) collectRadius(n, "badge");
    if (/input|field|kolom/.test(nm)) collectRadius(n, "input");
  }
}
out.radii = radii;

// 88: warna chip kategori aktif vs nonaktif di Beranda Light+Dark
out.chipColors = [];
for (const f of frames) {
  if (/beranda/i.test(f.name)) {
    const chips = f.findAll((n) => /chip/i.test(n.name || "") || (n.type === "FRAME" && /semua|game|pulsa|data|pln|tagihan|e-wallet|voucher/i.test(n.name || "")));
    for (const c of chips.slice(0, 12)) {
      const fills = (c.fills || []).filter((fl) => fl.type === "SOLID").map((fl) => { const { r, g, b } = fl.color; return "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join(""); });
      let txt = null;
      try { const t = c.findOne((n) => n.type === "TEXT"); if (t) { const fl = (t.fills || []).find((x) => x.type === "SOLID"); if (fl) { const { r, g, b } = fl.color; txt = "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join(""); } } } catch {}
      out.chipColors.push({ frame: f.name, name: (c.name || "").slice(0, 40), fill: fills, text: txt });
    }
  }
}

// 89: ikon sebagai teks vs vektor (di luar trust) — teks 1 karakter simbol
const GLYPHS = ["✓", "‹", "›", "▾", "▸", "×", "−", "+", "🔒", "🔍", "💰", "⚡", "🎮", "📱", "•", "›"];
out.glyphTexts = [];
for (const f of frames) {
  for (const n of f.findAll((n2) => n2.type === "TEXT")) {
    const ch = (n.characters || "").trim();
    if (ch.length <= 2 && GLYPHS.some((g) => ch.includes(g))) {
      if (out.glyphTexts.length < 40) out.glyphTexts.push({ frame: f.name, text: ch, name: (n.name || "").slice(0, 50) });
    }
  }
}
out.glyphCount = 0;
for (const f of frames) {
  for (const n of f.findAll((n2) => n2.type === "TEXT")) {
    const ch = (n.characters || "").trim();
    if (ch.length <= 2 && GLYPHS.some((g) => ch.includes(g))) out.glyphCount++;
  }
}

// 90: divider — rect 1px vs line
out.dividers = { rect1px: 0, lineNodes: 0, samples: [] };
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    const nm = (n.name || "").toLowerCase();
    if (/divider|garis|pembatas|separator|line/i.test(nm)) {
      if (n.type === "LINE" && out.dividers.samples.length < 15) out.dividers.samples.push({ frame: f.name, type: "LINE", name: n.name.slice(0, 50), w: Math.round(n.width), h: Math.round(n.height) });
      else if (n.type === "RECTANGLE" && Math.round(n.height) === 1 && out.dividers.samples.length < 15) out.dividers.samples.push({ frame: f.name, type: "RECT-1px", name: n.name.slice(0, 50), w: Math.round(n.width) });
    }
    if (n.type === "LINE") out.dividers.lineNodes++;
    if (n.type === "RECTANGLE" && Math.round(n.height) === 1) out.dividers.rect1px++;
  }
}
return out;
