// Probe Siklus 74c: geometri kartu flash (rect 358 lebar + teks nama) di satu frame.
// Read-only. Placeholder __FRAME__ diisi driver.
const FRAME_ID = "__FRAME__";
const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const rects = [];
for (const n of f.findAllWithCriteria({ types: ["RECTANGLE"] })) {
  if (Math.round(n.width) === 358) rects.push({ name: (n.name || "").slice(0, 30), x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) });
}
const names = [];
for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
  if (t.characters === "Weekly Diamond Pass" || t.characters === "70 Diamonds") {
    names.push({ chars: t.characters, fs: t.fontSize, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) });
  }
}
return { frame: f.name, frameH: Math.round(f.height), rects358: rects.slice(0, 12), names };
