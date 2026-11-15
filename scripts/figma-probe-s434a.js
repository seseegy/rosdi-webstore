// Probe s434a — read-only: semua teks + geometri frame mobile kunci.
// Dipakai ide 1,3,5,6,8,9,10,14,15,21-28,30,51,60-70.
const TARGETS = {
  "1:2": "Beranda-L", "1:105": "Beranda-D", "1:208": "ProdukGame-L",
  "15:2": "Cari-mlbb-L", "16:2": "Cari-zzz-L", "2:2": "Pulsa-L",
  "2:116": "PLN-L", "3:2": "Ewallet-L", "3:118": "Voucher-L",
  "3:236": "Cek-L", "4:2": "Sukses-L", "6:2": "Genshin-L",
  "111:2": "FF-L", "114:2": "PUBG-L", "116:2": "HoK-L", "120:2": "Roblox-L",
  "270:2": "Valorant-L", "272:2": "COD-L", "274:2": "WR-L", "277:2": "AoV-L",
  "279:2": "DF-L", "100:2": "Steam-L", "105:2": "PSN-L",
  "41:2": "PaketData-L", "295:74": "ByU-L", "311:2": "PLNPasca-L",
  "77:2": "SuksesPLN-L", "317:2": "SuksesPasca-L",
};
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;
const hex = (fills) => {
  if (!fills || !fills.length) return null;
  const s = fills.find((x) => x.type === "SOLID");
  if (!s) return fills[0].type;
  const c = s.color;
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return "#" + to(c.r) + to(c.g) + to(c.b);
};
const out = {};
for (const [fid, label] of Object.entries(TARGETS)) {
  const f = byId[fid];
  if (!f) { out[label] = "FRAME HILANG"; continue; }
  const texts = f.findAllWithCriteria({ types: ["TEXT"] }).map((t) => ({
    c: t.characters.trim(), fs: t.fontSize, fill: hex(t.fills),
    x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height),
  })).filter((t) => t.c);
  // Batang progress: persegi tipis (tinggi <= 8) di dalam kartu flash
  const bars = f.findAllWithCriteria({ types: ["RECTANGLE"] })
    .filter((r) => r.height <= 8 && r.width > 40)
    .map((r) => ({ name: r.name, fill: hex(r.fills), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }));
  out[label] = { nTexts: texts.length, texts, bars };
}
return out;
