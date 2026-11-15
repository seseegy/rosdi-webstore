// Repair Siklus 73: teks inisial tile kartu flash (ML/FF) yang dibuat builder
// v1 ter-insert di bawah tile sehingga tertutup — pindahkan tepat di atas
// tile-nya (insertChild indexOf(tile)+1). Dijalankan lewat use_figma;
// placeholder __FRAME__ diisi driver. Idempotent: bila sudah di atas tile,
// tidak ada yang dipindah.
const FRAME_ID = "__FRAME__";
const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const texts = f.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters === "ML" || t.characters === "FF");
const rects = f.children.filter((c) => c.type === "RECTANGLE" && Math.round(c.width) === 46 && Math.round(c.height) === 46);
const moved = [];
for (const t of texts) {
  const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
  const tile = rects.find((r) => cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height);
  if (!tile) { moved.push({ ini: t.characters, error: "tile tidak ditemukan" }); continue; }
  const ti = f.children.indexOf(tile);
  const ni = f.children.indexOf(t);
  // Perbaiki juga posisi x: builder v1 memakai resize(60,...) sehingga
  // width node 60 (bukan lebar glif) dan teks bergeser ~20px ke kiri —
  // kembalikan ke ukuran konten lalu pusatkan di tile.
  t.textAutoResize = "WIDTH_AND_HEIGHT";
  t.x = Math.round(tile.x + tile.width / 2 - t.width / 2);
  t.y = Math.round(tile.y + tile.height / 2 - t.height / 2);
  if (ni !== ti + 1) f.insertChild(ti + 1, t);
  moved.push({ ini: t.characters, tileY: Math.round(tile.y), textX: Math.round(t.x), textW: Math.round(t.width) });
}
return { frame: f.name, moved };
