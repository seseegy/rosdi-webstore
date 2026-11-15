// Read-only audit s440 (bagian A): label biaya, badge, harga coret, "Mulai",
// tanggal demo, teks kosong. Agregat per frame agar return tetap kecil.
const PATTERNS = {
  biaya: /biaya/i,
  tanpaBiaya: /tanpa biaya/i,
  pulsaFee: /3\.045|7%/,
  terlaris: /Terlaris/,
  minus5: /-5%/,
  minus10: /-10%/,
  flashSale: /Flash sale/i,
  was185: /185\.000/,
  was309: /30\.900/,
  was105: /10\.500/,
  mulai: /Mulai/i,
  dariRp: /dari Rp/i,
  rpPlus: /Rp[\d.]+ ?\+/,
  tanggal: /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\.\d{2}/,
  emptyText: /Tidak ada produk/,
  gratis: /Gratis/,
  rp0: /Rp0\b/,
};
const out = {};
for (const k of Object.keys(PATTERNS)) out[k] = { count: 0, frames: {}, samples: [] };
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    const s = t.characters;
    for (const k of Object.keys(PATTERNS)) {
      if (PATTERNS[k].test(s)) {
        out[k].count++;
        out[k].frames[f.name] = (out[k].frames[f.name] || 0) + 1;
        if (out[k].samples.length < 5) out[k].samples.push({ frame: f.name, chars: s.slice(0, 60) });
      }
    }
  }
}
// Geometri kartu empty-state di frame zzz (Light).
let emptyGeom = null;
for (const f of frames) {
  if (f.name.indexOf("Pencarian") >= 0 && f.name.indexOf("zzz") >= 0 && f.name.indexOf("Light") >= 0) {
    const texts = f.findAllWithCriteria({ types: ["TEXT"] });
    for (const t of texts) {
      if (/Tidak ada produk/.test(t.characters)) {
        const p = t.parent;
        emptyGeom = {
          frame: f.name,
          text: t.characters.slice(0, 120),
          textRect: [Math.round(t.x), Math.round(t.y), Math.round(t.width), Math.round(t.height)],
          fontSize: t.fontSize,
          parentName: p ? p.name : null,
          parentType: p ? p.type : null,
          parentRect: p ? [Math.round(p.x), Math.round(p.y), Math.round(p.width), Math.round(p.height)] : null,
        };
      }
    }
  }
}
return { part: "A", patterns: out, emptyGeom, frameCount: frames.length };
