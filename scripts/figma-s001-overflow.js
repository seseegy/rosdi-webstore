// Probe read-only batch s001: overflow + geometri spesifik.
// 1. Teks/node yang meluber keluar batas frame (x+w > frame.w / y+h > frame.h / x<0 / y<0).
// 2. Badge "-10%" / "-5%" / "Flash sale": posisi relatif kartu induknya.
// 3. Hero Beranda: y headline vs y kartu promo pertama; chip row: chip terakhir vs lebar frame.
// 4. Pencarian teks spesifik: "Arena of Valor", "Honor of Kings", "ROSDI10",
//    "Riot", "RSD-", "20 digit", "DANA", "Terlaris", "Termurah", "11.11".
// 5. Teks harga Rp terpanjang & nama paket terpanjang (lebar node vs lebar induk).
function abs(n) { const t = n.absoluteTransform; return t ? { x: t[0][2], y: t[1][2] } : { x: n.x, y: n.y }; }
const page = figma.currentPage;
const frames = page.children.filter((n) => n.type === "FRAME");
const out = { frameCount: frames.length, overflow: [], badges: [], hero: [], chips: [], found: {}, longTexts: [] };
const NEEDLES = ["Arena of Valor", "Honor of Kings", "ROSDI10", "Riot", "RSD-", "20 digit", "DANA", "Terlaris", "Termurah", "11.11", "Wild Rift", "Call of Duty"];
for (const nd of NEEDLES) out.found[nd] = [];
for (const f of frames) {
  const fa = abs(f);
  const all = f.findAll(() => true);
  for (const n of all) {
    // overflow absolut terhadap frame (node langsung maupun nested: pakai absolute coords)
    const na = abs(n); const ax = na.x - fa.x, ay = na.y - fa.y;
    if (n.visible !== false && (ax < -0.5 || ay < -0.5 || ax + n.width > f.width + 0.5 || ay + n.height > f.height + 0.5)) {
      if (out.overflow.length < 40) out.overflow.push({ frame: f.name, node: n.name, type: n.type, x: Math.round(ax), y: Math.round(ay), w: Math.round(n.width), h: Math.round(n.height), fw: f.width, fh: f.height, chars: n.type === "TEXT" ? String(n.characters).slice(0, 40) : "" });
    }
    if (n.type === "TEXT") {
      const c = n.characters || "";
      for (const nd of NEEDLES) if (c.includes(nd)) {
        if (out.found[nd].length < 6) out.found[nd].push({ frame: f.name, node: n.name, chars: c.slice(0, 60), x: Math.round(ax), y: Math.round(ay), w: Math.round(n.width), size: n.fontSize });
      }
      if (/^-?\d+%$/.test(c.trim()) || c.trim() === "Flash sale") {
        const p = n.parent;
        if (out.badges.length < 40) out.badges.push({ frame: f.name, chars: c.trim(), x: Math.round(ax), y: Math.round(ay), w: Math.round(n.width), h: Math.round(n.height), parent: p ? p.name + " " + Math.round(p.width) + "x" + Math.round(p.height) : "?", parentX: p ? Math.round(abs(p).x - fa.x) : 0, parentW: p ? Math.round(p.width) : 0 });
      }
      if (/^Rp[\d.]+$/.test(c.trim()) && n.width > 110 && out.longTexts.length < 30) out.longTexts.push({ frame: f.name, chars: c.trim(), w: Math.round(n.width), size: n.fontSize });
      if (c.length > 28 && n.width > 300 && out.longTexts.length < 30) out.longTexts.push({ frame: f.name, chars: c.slice(0, 60), w: Math.round(n.width), size: n.fontSize });
    }
  }
  // hero Beranda: headline + kartu promo pertama
  if (/Beranda/i.test(f.name)) {
    const texts = f.findAll((n) => n.type === "TEXT");
    const hero = texts.find((t) => /Top up, harga final/.test(t.characters || ""));
    const promo = f.findAll((n) => /promo|flash/i.test(n.name));
    out.hero.push({ frame: f.name, w: f.width, heroY: hero ? Math.round(abs(hero).y - fa.y) : null, heroH: hero ? Math.round(hero.height) : null, promoNames: promo.slice(0, 4).map((p) => ({ name: p.name, y: Math.round(abs(p).y - fa.y) })) });
    // chip row: cari frame/node bernama chip
    const chips = f.findAll((n) => /chip/i.test(n.name));
    if (chips.length) {
      const last = chips[chips.length - 1];
      out.chips.push({ frame: f.name, count: chips.length, firstX: Math.round(abs(chips[0]).x - fa.x), lastX: Math.round(abs(last).x - fa.x), lastW: Math.round(last.width), lastRight: Math.round(abs(last).x - fa.x + last.width), frameW: f.width });
    }
  }
}
out.overflowCount = out.overflow.length;
out.badgeCount = out.badges.length;
return out;
