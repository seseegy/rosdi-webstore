// Probe read-only Siklus 134: struktur klon modal DESKTOP Beranda — grid game,
// veil, kartu modal, tinggi frame — untuk sinkron grid 11 kartu.
// Frame: Masuk 165:2/165:247, S&K 170:2/170:247, Refund 170:492/170:737.
// Referensi: Beranda Desktop 20:2/21:2 (sudah 11 kartu sejak Siklus 126).
const FRAMES = ["165:2", "165:247", "170:2", "170:247", "170:492", "170:737", "20:2", "21:2"];
const GAMES = ["Mobile Legends", "Free Fire", "Genshin Impact", "PUBG Mobile", "Honor of Kings", "Roblox", "Valorant", "Call of Duty: Mobile", "League of Legends: Wild Rift", "Arena of Valor", "Delta Force"];
const out = [];
for (const fid of FRAMES) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { out.push({ id: fid, error: "hilang" }); continue; }
  const kids = f.children.map((c) => ({
    id: c.id, name: c.name, type: c.type,
    x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height),
  }));
  const veil = kids.find((k) => k.name === "Veil");
  const veilIdx = kids.findIndex((k) => k.name === "Veil");
  const gameBgs = kids.filter((k) => k.type === "RECTANGLE" && GAMES.indexOf(k.name) >= 0)
    .map((k) => ({ name: k.name, x: k.x, y: k.y, w: k.w, h: k.h }));
  const headers = kids.filter((k) => k.type === "TEXT" && (k.name.indexOf("Top Up Game") === 0 || k.name.indexOf("Pulsa, Data") === 0 || k.name.indexOf("Kenapa") === 0 || k.name.indexOf("Cara Top") === 0))
    .map((k) => ({ name: k.name, y: k.y }));
  // Kartu modal: RECTANGLE terbesar setelah veil (bukan bg frame, bukan veil)
  const afterVeil = veilIdx >= 0 ? kids.slice(veilIdx + 1) : [];
  const modalCard = afterVeil.filter((k) => k.type === "RECTANGLE" && k.w > 300 && k.w < 700 && k.h > 100 && k.h < 500)
    .map((k) => ({ name: k.name, y: k.y, h: k.h, w: k.w }));
  // Teks judul kartu modal (pertama setelah veil)
  const modalTexts = afterVeil.filter((k) => k.type === "TEXT").slice(0, 3)
    .map((k) => ({ name: k.name, y: k.y }));
  out.push({ id: fid, name: f.name, frameH: Math.round(f.height), frameW: Math.round(f.width), veil, veilIdx, gameBgs, headers, modalCard, modalTexts });
}
return out;
