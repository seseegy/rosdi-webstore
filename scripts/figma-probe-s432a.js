// Probe s432a — read-only: J93 isi meluber, J94 aside 356, J95 header 62,
// J96 grid gap desktop, J97 placeholder, J100 biru Light lama.
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const out = { overflow: [], aside: {}, header: {}, gridGap: {}, placeholders: {}, blue: {} };
const frames = figma.currentPage.children;

// J93: isi meluber melewati batas frame (relatif ke frame)
for (const f of frames) {
  let maxB = 0, maxR = 0, worstB = null, worstR = null;
  const walk = (n) => {
    if (n.absoluteBoundingBox) {
      const b = n.absoluteBoundingBox;
      const relB = b.y + b.height - f.absoluteBoundingBox.y;
      const relR = b.x + b.width - f.absoluteBoundingBox.x;
      if (relB > maxB) { maxB = relB; worstB = n.name.slice(0, 40) + " (" + n.type + ")"; }
      if (relR > maxR) { maxR = relR; worstR = n.name.slice(0, 40) + " (" + n.type + ")"; }
    }
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(f);
  out.overflow.push({ frame: f.name, id: f.id, h: Math.round(f.height), w: Math.round(f.width), maxBottom: Math.round(maxB), overBottom: Math.round(maxB - f.height), worstB, maxRight: Math.round(maxR), overRight: Math.round(maxR - f.width), worstR });
}

// J94: node selebar ~356 di frame desktop produk (aside Ringkasan)
const deskProduct = ["26:2", "28:2", "30:2", "31:2", "33:2", "84:2", "87:2", "90:2", "93:2", "95:2", "46:2", "100:232", "105:162", "280:2", "283:2", "285:2", "286:2", "287:2", "296:2"];
const byId = {};
for (const f of frames) byId[f.id] = f;
for (const fid of deskProduct) {
  const f = byId[fid];
  if (!f) { out.aside[fid] = "FRAME HILANG"; continue; }
  const hits = [];
  const walk = (n) => {
    if (Math.abs(n.width - 356) <= 2 && n.type !== "TEXT") hits.push({ name: n.name.slice(0, 34), x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) });
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(f);
  const ringkasan = [];
  const walk2 = (n) => {
    if (/ringkas/i.test(n.name)) ringkasan.push({ name: n.name.slice(0, 34), w: Math.round(n.width), h: Math.round(n.height) });
    if ("children" in n) for (const c of n.children) walk2(c);
  };
  walk2(f);
  out.aside[f.name] = { w356: hits.slice(0, 4), ringkasan: ringkasan.slice(0, 4) };
}

// J95: tinggi header desktop (anak y=0 selebar penuh)
for (const fid of ["20:2", "26:2", "28:2", "30:2", "31:2", "33:2", "36:2", "36:166"]) {
  const f = byId[fid];
  if (!f) { out.header[fid] = "HILANG"; continue; }
  const tops = f.children.filter((c) => c.y <= 1).map((c) => ({ name: c.name.slice(0, 30), y: Math.round(c.y), h: Math.round(c.height), w: Math.round(c.width) }));
  out.header[f.name] = tops.slice(0, 4);
}

// J96: gap antar kartu — Beranda Desktop game grid vs Produk Game Desktop nominal grid
const cardXs = (frame, names) => {
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => names.includes(t.characters.trim()));
  const cards = texts.map((t) => {
    let p = t.parent;
    while (p && p !== frame && !(p.width > 150 && p.height > 60)) p = p.parent;
    const b = (p && p !== frame ? p : t).absoluteBoundingBox;
    const fb = frame.absoluteBoundingBox;
    return { name: t.characters.trim(), x: Math.round(b.x - fb.x), y: Math.round(b.y - fb.y), w: Math.round(b.width) };
  });
  cards.sort((a, b) => a.y - b.y || a.x - b.x);
  const gaps = [];
  for (let i = 1; i < cards.length; i++) {
    if (Math.abs(cards[i].y - cards[i - 1].y) < 5) gaps.push(cards[i].x - (cards[i - 1].x + cards[i - 1].w));
  }
  return { cards: cards.slice(0, 8), gaps: [...new Set(gaps)] };
};
const GAMES = ["Mobile Legends", "Free Fire", "Genshin Impact", "PUBG Mobile", "Honor of Kings", "Roblox", "Valorant", "Call of Duty: Mobile", "League of Legends: Wild Rift", "Arena of Valor", "Delta Force"];
out.gridGap.berandaDesk = cardXs(byId["20:2"], GAMES);
const NOMINALS = ["3 Diamonds", "5 Diamonds", "12 Diamonds", "28 Diamonds", "44 Diamonds", "59 Diamonds", "86 Diamonds", "172 Diamonds", "257 Diamonds", "344 Diamonds", "514 Diamonds", "706 Diamonds", "1050 Diamonds", "2195 Diamonds"];
out.gridGap.produkGameDesk = cardXs(byId["26:2"], NOMINALS);

// J97: placeholder / nilai contoh di Figma
const targets = ["12345678", "081234567890", "nama@email.com", "RSD-DEMO1234", "08xxxxxxxxxx", "1234"];
out.placeholders = {};
for (const t of targets) out.placeholders[t] = [];
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    const c = t.characters.trim();
    if (targets.includes(c)) out.placeholders[c].push(f.name);
  }
}
for (const k of Object.keys(out.placeholders)) out.placeholders[k] = { count: out.placeholders[k].length, frames: [...new Set(out.placeholders[k])].slice(0, 8) };

// J100: hitung fill biru di frame Light (teks + rect/frame)
const isBlue = (c) => c.b > 0.5 && c.b > c.r + 0.08 && c.g > c.r;
const counts = {};
const samples = {};
for (const f of frames) {
  if (!/Light$/.test(f.name)) continue;
  const walk = (n) => {
    const fills = n.fills;
    if (fills && fills.length) {
      for (const fl of fills) {
        if (fl.type === "SOLID" && fl.color && isBlue(fl.color)) {
          const h = hex(fl.color).toUpperCase();
          counts[h] = (counts[h] || 0) + 1;
          if (!samples[h]) samples[h] = [];
          if (samples[h].length < 6) samples[h].push(f.name + " :: " + n.name.slice(0, 30) + " (" + n.type + ")");
        }
      }
    }
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(f);
}
out.blue = { counts, samples };
return out;
