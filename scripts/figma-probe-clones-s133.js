// Probe read-only Siklus 133: struktur klon Beranda — grid game, veil, kartu modal,
// tinggi frame — untuk sinkron grid 11 kartu.
// Frame: S&K 10:2/10:105, Refund 13:2/13:111, Masuk 162:2/162:111,
// Pencarian mlbb 15:2/15:105, Pencarian zzz 16:2/16:107.
const FRAMES = ["10:2", "10:105", "13:2", "13:111", "162:2", "162:111", "15:2", "15:105", "16:2", "16:107"];
const GAMES = ["Mobile Legends", "Free Fire", "Genshin Impact", "PUBG Mobile", "Honor of Kings", "Roblox"];
const out = [];
for (const fid of FRAMES) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { out.push({ id: fid, error: "hilang" }); continue; }
  const kids = f.children.map((c) => ({
    id: c.id, name: c.name, type: c.type,
    x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height),
  }));
  const veil = kids.find((k) => k.name === "Veil");
  const gameBgs = kids.filter((k) => k.type === "RECTANGLE" && GAMES.indexOf(k.name) >= 0)
    .map((k) => ({ name: k.name, x: k.x, y: k.y, w: k.w, h: k.h }));
  const headers = kids.filter((k) => k.type === "TEXT" && (k.name.indexOf("Top Up Game") === 0 || k.name.indexOf("Pulsa, Data") === 0 || k.name.indexOf("Kenapa") === 0))
    .map((k) => ({ name: k.name, y: k.y }));
  // Kartu modal: RECTANGLE terbesar di atas veil (bukan bg frame, bukan veil)
  const modalCard = kids.filter((k) => k.type === "RECTANGLE" && k.name !== "Veil" && GAMES.indexOf(k.name) < 0 && k.w > 300 && k.w < 390 && k.h > 100 && k.h < 400)
    .map((k) => ({ name: k.name, y: k.y, h: k.h }));
  out.push({ id: fid, name: f.name, frameH: Math.round(f.height), veil, gameBgs, headers, modalCard });
}
return out;
