// Read-only s439: dump SEMUA teks (chars, maks 90) dari frame-frame target,
// untuk verifikasi meta/nama/tanggal vs data.js. TARGETS diisi pemanggil.
const TARGETS = __TARGETS__;
const out = [];
for (const f of figma.currentPage.children.filter((n) => n.type === "FRAME")) {
  if (!TARGETS.includes(f.name)) continue;
  const texts = f.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.slice(0, 90));
  out.push({ frame: f.name, texts });
}
return out;
