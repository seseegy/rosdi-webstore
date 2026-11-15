// Read-only probe Siklus 431d (tindak lanjut): ide 81, 82, 83, 84, 88, 20, 66-68.
// 81: hitung frame top-level + pasangan Light/Dark.
// 82: y maksimum frame + apakah baris y≈105932 kosong.
// 83: pola nama "Nama — Light"/"Nama — Dark" (em-dash).
// 84: grid game desktop Beranda (frame 20:2): jumlah kartu + kolom distinct-x.
// 88/20: semua teks "Mulai RpX" di frame klon Beranda + Beranda Light vs from data.js.
// 66-68: warna tile operator/e-money/voucher di Beranda Light vs warna data.js.
const FROM = { "Mobile Legends": 1650, "Free Fire": 1000, "Genshin Impact": 12500, "PUBG Mobile": 14500, "Honor of Kings": 1500, "Roblox": 15500, "Valorant": 59000, "Call of Duty: Mobile": 15000, "League of Legends: Wild Rift": 79000, "Arena of Valor": 15000, "Delta Force": 15000, "Pulsa Reguler": 6500, "Paket Data": 15000, "Token PLN": 22500, "Saldo DANA": 10292, "Saldo GoPay": 10292, "Saldo OVO": 10292, "Saldo ShopeePay": 10292, "Voucher Google Play": 5500, "Steam Wallet IDR": 12600, "PlayStation Network ID": 108000 };
const frames = figma.currentPage.children;
const out = { count: frames.length, names: frames.map((f) => f.name), maxY: 0, maxYFrame: "", pairs: {}, namingBad: [], deskGrid: null, mulaiRp: {}, tiles: {} };
// 81/82/83
for (const f of frames) {
  const b = f.absoluteBoundingBox;
  if (b.y + b.height > out.maxY) { out.maxY = +(b.y + b.height).toFixed(0); out.maxYFrame = f.name; }
  const m = f.name.match(/^(.*) — (Light|Dark)$/);
  if (!m) out.namingBad.push(f.name);
  else { const base = m[1]; out.pairs[base] = out.pairs[base] || {}; out.pairs[base][m[2]] = true; }
}
out.unpaired = Object.entries(out.pairs).filter(([, v]) => !v.Light || !v.Dark).map(([k, v]) => ({ name: k, has: Object.keys(v) }));
out.emptyRow105932 = frames.filter((f) => { const b = f.absoluteBoundingBox; return b.y < 105932 && b.y + b.height > 105932; }).map((f) => f.name);
// 84: grid desktop Beranda 20:2 — kartu game = node bernama "GameCard ..." (cari semua TEXT nama game + x)
{
  const frame = frames.find((f) => f.id === "20:2");
  if (frame) {
    const texts = frame.findAllWithCriteria({ types: ["TEXT"] });
    const gameTexts = texts.filter((t) => Object.keys(FROM).includes(t.characters.trim()) && /Mobile Legends|Free Fire|Genshin|PUBG|Honor of Kings|Roblox|Valorant|Call of Duty|Wild Rift|Arena of Valor|Delta Force/.test(t.characters));
    out.deskGrid = { gameNameTexts: gameTexts.length, xs: [...new Set(gameTexts.map((t) => Math.round(t.absoluteBoundingBox.x)))].sort((a, b) => a - b), sample: gameTexts.slice(0, 4).map((t) => ({ name: t.characters, x: Math.round(t.absoluteBoundingBox.x), y: Math.round(t.absoluteBoundingBox.y) })) };
  }
}
// 88/20: "Mulai Rp" di semua frame (klon + utama)
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const mulai = texts.filter((t) => /^Mulai Rp[\d.]+$/.test(t.characters.trim())).map((t) => t.characters.trim());
  if (mulai.length) out.mulaiRp[f.name] = mulai;
}
// 66-68: tile fills di Beranda Light 1:2 — RECTANGLE bernama *Tile* atau fill solid unik + nama
{
  const frame = frames.find((f) => f.id === "1:2");
  if (frame) {
    const rects = frame.findAllWithCriteria({ types: ["RECTANGLE"] });
    const seen = {};
    for (const r of rects) {
      const fill = r.fills && r.fills[0] && r.fills[0].type === "SOLID" ? r.fills[0].color : null;
      if (!fill) continue;
      const hex = "#" + [fill.r, fill.g, fill.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
      const key = hex + "|" + (r.name || "").slice(0, 24);
      seen[key] = (seen[key] || 0) + 1;
    }
    out.tiles = seen;
  }
}
return out;
