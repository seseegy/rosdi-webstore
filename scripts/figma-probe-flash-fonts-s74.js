// Probe Siklus 74: ukuran font teks kartu flash + kartu game di satu frame.
// Read-only. Dijalankan lewat use_figma; placeholder __FRAME__ diisi driver.
const FRAME_ID = "__FRAME__";
const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const out = [];
for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
  const c = t.characters || "";
  if (/Weekly Diamond Pass|70 Diamonds|Rp27\.900|Rp30\.900|Rp9\.450|Rp10\.500|-10%|Terjual|Mobile Legends|Free Fire|Genshin Impact|PUBG Mobile|Honor of Kings|Roblox|Mulai Rp/.test(c)) {
    out.push({ chars: c.slice(0, 44), fs: t.fontSize, w: Math.round(t.width), h: Math.round(t.height), x: Math.round(t.x), y: Math.round(t.y), name: t.name });
  }
}
return { frame: f.name, frameH: Math.round(f.height), count: out.length, texts: out };
