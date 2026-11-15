// Probe Siklus 74b: cari semua kartu game di satu frame (nama + rect kartu).
// Read-only. Placeholder __FRAME__ diisi driver.
const FRAME_ID = "__FRAME__";
const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const games = ["Mobile Legends", "Free Fire", "Genshin Impact", "PUBG Mobile", "Honor of Kings", "Roblox"];
const found = [];
for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
  if (games.includes(t.characters)) found.push({ chars: t.characters, fs: t.fontSize, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) });
}
const rects = [];
for (const n of f.findAllWithCriteria({ types: ["RECTANGLE"] })) {
  if (Math.round(n.width) === 174 && Math.round(n.height) === 92) rects.push({ x: Math.round(n.x), y: Math.round(n.y) });
}
rects.sort((a, b) => a.y - b.y || a.x - b.x);
return { frame: f.name, games: found, cardRects174x92: rects };
