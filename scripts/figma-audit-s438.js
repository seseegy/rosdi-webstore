// Read-only audit s438: teks draf/placeholder, spasi, format harga, teks kosong,
// teks meluber kanan, nama layer generik, nama frame, geometri seksi.
// Semua filter dihitung di dalam plugin agar return tetap kecil.
const FROM = __FROM__;
const TO = __TO__;
const frames = figma.currentPage.children.slice(FROM, TO);
const out = { frameCount: frames.length, frames: [], draft: [], dblSpace: [], rpSpace: [], rpNoSep: [], rpDecimal: [], emptyText: [], overflowRight: [], genericNames: [], frameNames: [], sections: [] };
const KEYWORDS = ["garansi", "Kesalahan penulisan", "Bukti", "Simpan nomor", "Proses instan", "Harga transparan", "Garansi uang kembali", "CS 24/7", "Cara menemukan", "Contoh penulisan", "Stok tersedia", "maksimal 10"];
for (const f of frames) {
  const fb = f.absoluteRenderBounds;
  out.frameNames.push({ id: f.id, name: f.name, x: Math.round(fb.x), y: Math.round(fb.y), w: Math.round(fb.width), h: Math.round(fb.height) });
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    const c = t.characters;
    const tb = t.absoluteRenderBounds;
    const rec = { frame: f.name, id: t.id, name: t.name, chars: c.slice(0, 120) };
    if (/lorem|tbd|xxx|todo|contoh|test/i.test(c)) out.draft.push(rec);
    if (/  /.test(c) || / $/.test(c) || /^ /.test(c)) out.dblSpace.push(rec);
    if (/Rp \d/.test(c)) out.rpSpace.push(rec);
    if (/Rp\d{4,}/.test(c) && !/Rp\d{1,3}(\.\d{3})+/.test(c)) out.rpNoSep.push(rec);
    if (/Rp[\d.]+,\d/.test(c)) out.rpDecimal.push(rec);
    if (c === "") out.emptyText.push(rec);
    if (tb && fb && tb.x + tb.width > fb.x + fb.width + 0.5) out.overflowRight.push({ ...rec, over: Math.round((tb.x + tb.width - (fb.x + fb.width)) * 10) / 10 });
    if (KEYWORDS.some((k) => c.includes(k))) out.sections.push(rec);
  }
  // Nama layer generik di semua node frame ini (bukan cuma teks).
  const all = f.findAll(() => true);
  const generic = [];
  for (const n of all) {
    if (/^(Rectangle|Frame|Ellipse|Vector|Group|Text|Component) \d+$/.test(n.name)) generic.push(n.name);
  }
  if (generic.length) out.genericNames.push({ frame: f.name, count: generic.length, sample: generic.slice(0, 10) });
  // Geometri anak langsung dipindai terpisah (skrip figma-geometry-s438.js)
  // agar return scan ini tetap di bawah batas 48KB.
}
return out;
