// Probe s432b — read-only: teks per frame produk (A2/A3/A4/A5/A6/A7/A8/A9),
// urutan game + warna tile (A16/A17), Cara Top Up (J98/A10), trust (J99),
// nama item panjang (A19).
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const out = { steps: {}, games: {}, caraTopUp: {}, trust: {}, longNames: {} };
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;
const GAMES = ["Mobile Legends", "Free Fire", "Genshin Impact", "PUBG Mobile", "Honor of Kings", "Roblox", "Valorant", "Call of Duty: Mobile", "League of Legends: Wild Rift", "Arena of Valor", "Delta Force"];

// ---- A16/A17: urutan game + warna tile di Beranda mobile & desktop (Light+Dark)
for (const fid of ["1:2", "1:105", "20:2", "21:2"]) {
  const f = byId[fid];
  const texts = f.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => GAMES.includes(t.characters.trim()));
  texts.sort((a, b) => (a.absoluteBoundingBox.y - b.absoluteBoundingBox.y) || (a.absoluteBoundingBox.x - b.absoluteBoundingBox.x));
  out.games[f.name] = texts.map((t) => {
    let tile = null;
    const p = t.parent;
    if (p && p.children) {
      for (const sib of p.children) {
        if (sib.type === "RECT" && sib.fills && sib.fills[0] && sib.fills[0].type === "SOLID" && sib.width >= 30 && sib.width <= 60) { tile = hex(sib.fills[0].color); break; }
      }
    }
    return { name: t.characters.trim(), tile };
  });
}

// ---- A2/A3/A4/A5/A6/A7/A8/A9: label langkah di tiap frame produk
const productFrames = ["1:208", "1:314", "6:2", "6:108", "111:2", "111:139", "114:2", "114:125", "116:2", "116:132", "120:2", "120:125", "270:2", "270:140", "272:2", "272:141", "274:2", "274:140", "277:2", "277:141", "279:2", "279:141", "2:2", "2:59", "41:2", "41:94", "2:116", "2:181", "3:2", "3:60", "3:118", "3:177", "100:2", "100:117", "105:2", "105:82", "26:2", "26:281", "84:2", "84:249", "87:2", "87:258", "90:2", "90:241", "93:2", "93:249", "95:2", "95:241", "280:2", "280:250", "283:2", "283:244", "285:2", "285:247", "286:2", "286:244", "287:2", "287:244", "28:2", "28:259", "46:2", "46:235", "30:2", "30:241", "31:2", "31:251", "33:2", "33:239", "100:232", "100:477", "105:162", "105:387", "296:2", "296:265"];
const STEP_RE = /^(Masukkan|Pilih|Detail Kontak|Kode Promo|Jumlah Pembelian|Beli Sekarang|Cara menemukan|Contoh penulisan)/;
for (const fid of productFrames) {
  const f = byId[fid];
  if (!f) { out.steps[fid] = "FRAME HILANG"; continue; }
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const hits = [];
  for (const t of texts) {
    const c = t.characters.trim();
    if (STEP_RE.test(c) || /Garansi/.test(c) || /tanpa biaya|Rp0|Gratis/.test(c)) hits.push(c.slice(0, 90));
  }
  out.steps[f.name] = hits;
}

// ---- J98/A10: Cara Top Up di Beranda Desktop Light + mobile Light
for (const fid of ["20:2", "1:2"]) {
  const f = byId[fid];
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const idx = texts.findIndex((t) => t.characters.trim() === "Cara Top Up");
  const titles = ["Isi data tujuan", "Pilih nominal & pembayaran", "Selesai dalam detik"];
  const found = {};
  for (const title of titles) {
    const ti = texts.findIndex((t) => t.characters.trim() === title);
    found[title] = ti >= 0 ? { desc: (texts[ti + 1] ? texts[ti + 1].characters.trim().slice(0, 160) : "TIDAK ADA") } : "TIDAK ADA";
  }
  out.caraTopUp[f.name] = { sectionFound: idx >= 0, steps: found };
}

// ---- J99: trust card di Beranda mobile/desktop Light+Dark
const TRUST = ["Proses instan", "Harga transparan", "Garansi uang kembali", "CS 24/7"];
for (const fid of ["1:2", "1:105", "20:2", "21:2"]) {
  const f = byId[fid];
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const found = {};
  for (const title of TRUST) {
    const ti = texts.findIndex((t) => t.characters.trim() === title);
    found[title] = ti >= 0 ? (texts[ti + 1] ? texts[ti + 1].characters.trim().slice(0, 120) : "TANPA DESK") : "TIDAK ADA";
  }
  out.trust[f.name] = found;
}

// ---- A19: nama item panjang di Figma
const longTargets = [
  ["6:2", "Blessing of the Welkin Moon"], ["6:108", "Blessing of the Welkin Moon"],
  ["1:208", "Weekly Diamond Pass"], ["1:314", "Weekly Diamond Pass"],
  ["111:2", "Membership Bulanan"], ["111:139", "Membership Bulanan"],
];
for (const [fid, name] of longTargets) {
  const f = byId[fid];
  if (!f) { out.longNames[fid + "|" + name] = "FRAME HILANG"; continue; }
  const t = f.findAllWithCriteria({ types: ["TEXT"] }).find((x) => x.characters.trim() === name);
  if (!t) { out.longNames[f.name + " | " + name] = "TIDAK ADA"; continue; }
  out.longNames[f.name + " | " + name] = { w: Math.round(t.width), h: Math.round(t.height), fontSize: t.fontSize, parentW: Math.round(t.parent.width), parentH: Math.round(t.parent.height), parentName: t.parent.name.slice(0, 30) };
}
return out;
