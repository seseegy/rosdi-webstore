// Probe s434b — read-only: semua teks + geometri frame desktop kunci.
// Dipakai ide 1,3,5,6,10,14,20,29,65,71-80.
const TARGETS = {
  "20:2": "BerandaDesk-L", "21:2": "BerandaDesk-D", "26:2": "ProdukGameDesk-L",
  "28:2": "PulsaDesk-L", "30:2": "PLNDesk-L", "31:2": "DANADesk-L",
  "33:2": "VoucherDesk-L", "36:2": "CekDesk-L", "36:166": "SuksesDesk-L",
  "84:2": "GIDesk-L", "87:2": "FFDesk-L", "90:2": "PUBGDesk-L",
  "93:2": "HoKDesk-L", "95:2": "RobloxDesk-L", "280:2": "ValorantDesk-L",
  "283:2": "CODDesk-L", "285:2": "WRDesk-L", "286:2": "AoVDesk-L",
  "287:2": "DFDesk-L", "80:2": "SuksesPLNDesk-L", "317:56": "SuksesPascaDesk-L",
  "311:174": "PLNPascaDesk-L", "296:2": "ByUDesk-L", "46:2": "PaketDataDesk-L",
  "100:232": "SteamDesk-L", "105:162": "PSNDesk-L",
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
  const bars = f.findAllWithCriteria({ types: ["RECTANGLE"] })
    .filter((r) => r.height <= 8 && r.width > 40)
    .map((r) => ({ name: r.name, fill: hex(r.fills), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }));
  out[label] = { nTexts: texts.length, texts, bars };
}
return out;
