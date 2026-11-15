// Read-only audit s441 (A): struktur file, Variables, pola teks, font, image fill.
// Satu tarikan data untuk ide 19, 27, 41-50, 81-90 (pola/teks/struktur).
const out = {};
out.pages = figma.root.children.map((p) => ({ name: p.name, type: p.type, children: p.children.length }));
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) {
    if (n.type === "FRAME") frames.push(n);
  }
}
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
out.frameCount = frames.length;
out.frameList = frames.map((f) => ({
  id: f.id, name: f.name, x: Math.round(f.x), y: Math.round(f.y),
  w: Math.round(f.width), h: Math.round(f.height),
  exports: (f.exportSettings || []).length,
  desc: (f.description || "").slice(0, 120),
  grids: (f.layoutGrids || []).map((g) => ({ pattern: g.pattern, count: g.count, sectionSize: g.sectionSize, gutterSize: g.gutterSize })),
  children: f.children.length,
}));
// Node di luar frame (anotasi/redline di kanvas?)
out.nonFrameTop = [];
for (const p of figma.root.children) {
  for (const n of p.children) {
    if (n.type !== "FRAME") out.nonFrameTop.push({ page: p.name, type: n.type, name: n.name.slice(0, 80), x: Math.round(n.x), y: Math.round(n.y) });
  }
}
// Variabel lokal: API plugin hanya menyediakan versi async
// (getLocalVariablesAsync) yang tidak bisa dipakai di skrip eval sinkron ini
// — dicek terpisah lewat tool get_variable_defs (lihat hasil JSON).
out.variables = { note: "dicek via get_variable_defs" };
// Sapuan teks: font, missing font, image fill, pola kata kunci.
const KEYWORDS = ["resmi", "Diskon", "7%", "Termurah", "tanpa perlu login", "tanpa login", "bukan afiliasi", "Penipuan", "penipuan", "Pembayaran aman", "terenkripsi", "Syarat", "12+", "13+", "17+", "18+", "harga dapat berubah", "dapat berubah", "Hati-hati", "privasi", "orang lain", "reseller", "borongan", "1 langkah", "1 hari", "1 item", "tanpa biaya tambahan", "tanpa akun", "sebagai tamu", "Gratis", "Garansi", "1x24"];
const hits = {};
for (const k of KEYWORDS) hits[k] = [];
const families = {};
let missingFont = [];
let imageFills = 0;
let totalTexts = 0;
let totalNodes = 0;
for (const f of frames) {
  const all = f.findAll(() => true);
  totalNodes += all.length;
  for (const n of all) {
    if (n.type === "TEXT") {
      totalTexts++;
      const ch = n.characters || "";
      const fam = (n.fontName && n.fontName.family) || "?";
      families[fam] = (families[fam] || 0) + 1;
      try { if (n.hasMissingFont) missingFont.push({ frame: f.name, text: ch.slice(0, 60) }); } catch {}
      for (const k of KEYWORDS) {
        if (ch.toLowerCase().includes(k.toLowerCase())) {
          if (hits[k].length < 8) hits[k].push({ frame: f.name, text: ch.slice(0, 90) });
        }
      }
    }
    if (n.fills && Array.isArray(n.fills)) {
      for (const fl of n.fills) if (fl && fl.type === "IMAGE") imageFills++;
    }
  }
}
out.totalNodes = totalNodes;
out.totalTexts = totalTexts;
out.families = families;
out.missingFont = missingFont.slice(0, 10);
out.missingFontCount = missingFont.length;
out.imageFills = imageFills;
out.keywordHits = hits;
// Nama layer yang mengandung focus/hover/disabled (state digambar?)
const stateNames = { focus: [], hover: [], disabled: [], nonaktif: [] };
for (const f of frames) {
  const all = f.findAll(() => true);
  for (const n of all) {
    const nm = (n.name || "").toLowerCase();
    if (nm.includes("focus") && stateNames.focus.length < 10) stateNames.focus.push({ frame: f.name, name: n.name.slice(0, 80) });
    if (nm.includes("hover") && stateNames.hover.length < 10) stateNames.hover.push({ frame: f.name, name: n.name.slice(0, 80) });
    if (nm.includes("disabled") && stateNames.disabled.length < 10) stateNames.disabled.push({ frame: f.name, name: n.name.slice(0, 80) });
    if (nm.includes("nonaktif") && stateNames.nonaktif.length < 10) stateNames.nonaktif.push({ frame: f.name, name: n.name.slice(0, 80) });
  }
}
out.stateNames = stateNames;
return out;
