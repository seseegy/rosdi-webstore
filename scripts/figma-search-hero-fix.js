// Perbaikan: rect hero frame pencarian w=390 -> 358 (Siklus 63).
// Warisan klon Beranda sebelum perbaikan lebar Siklus 11; x tetap 16,
// tepi kanan 374 = 390-16, sejajar kartu lain. Teks di dalam hero
// diposisikan relatif frame, jadi tidak ada simpul lain yang perlu geser.
const HERO_IDS = ["15:12", "15:115", "16:12", "16:117"];
const out = [];
for (const id of HERO_IDS) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { out.push({ id, ok: false, why: "not-found" }); continue; }
  const before = { x: n.x, w: n.width, h: n.height };
  n.resize(358, n.height);
  out.push({ id, ok: true, before, after: { x: n.x, w: n.width, h: n.height } });
}
return { fixed: out };
