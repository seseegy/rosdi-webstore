// Audit read-only s445 bagian I (ide 81-90): nama frame duplikat, teks ALL
// CAPS, karakter pemisah, opacity < 100%, blend mode, panjang divider,
// badge -5% (706 DM) & Terlaris (172 DM) lintas frame Produk Game,
// harga coret "was" kartu flash, countdown flash. Semua agregasi dihitung
// di dalam plugin agar return tetap kecil.
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));

// ide 81: nama frame duplikat
const nameCount = {};
for (const f of frames) nameCount[f.name] = (nameCount[f.name] || 0) + 1;
const duplicates = Object.entries(nameCount).filter(([, c]) => c > 1).map(([n, c]) => n + " x" + c);

// ide 82/83/84/85/86: sapu semua node
const caps = [];            // {frame, teks, size}
const sepCount = { middot: 0, pipe: 0, bullet: 0, dashSep: 0 };
const sepSamples = { pipe: [], bullet: [], dashSep: [] };
const opacityLow = [];      // {frame, nama, tipe, opacity}
const blendNonNormal = [];  // {frame, nama, tipe, blend}
const dividers = [];        // {frame, nama, w, h, induk, indukW, selisih}
let totalNodes = 0, totalTexts = 0;
for (const f of frames) {
  const all = f.findAll(() => true);
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  totalNodes += all.length;
  totalTexts += texts.length;
  for (const n of all) {
    if (typeof n.opacity === "number" && n.opacity < 1 && !/veil|danamon/i.test(n.name || "")) {
      if (opacityLow.length < 80) opacityLow.push({ frame: f.name, nama: n.name, tipe: n.type, opacity: Math.round(n.opacity * 100) / 100 });
    }
    if (n.blendMode && n.blendMode !== "NORMAL") {
      if (blendNonNormal.length < 80) blendNonNormal.push({ frame: f.name, nama: n.name, tipe: n.type, blend: n.blendMode });
    }
    // divider: garis (LINE) atau persegi sangat tipis, atau bernama divider
    const isDivider = n.type === "LINE" || /divider|pemisah|separator/i.test(n.name || "") ||
      (n.type === "RECTANGLE" && (n.height <= 2 || n.width <= 2));
    if (isDivider && n.parent && typeof n.parent.width === "number") {
      const pw = Math.round(n.parent.width);
      const w = Math.round(n.width);
      const h = Math.round(n.height);
      const horizontal = h <= 2 && w > 2;
      if (horizontal && w !== pw) {
        if (dividers.length < 80) dividers.push({ frame: f.name, nama: n.name, w, induk: n.parent.name, indukW: pw, selisih: w - pw });
      }
    }
  }
  for (const t of texts) {
    const s = t.characters || "";
    // ALL CAPS: ada >=3 huruf dan semua huruf kapital (abaikan angka/simbol)
    const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (letters.length >= 3 && letters === letters.toUpperCase() && /[A-Z]/.test(letters)) {
      let size = null;
      try { size = t.fontSize; } catch { /* abaikan */ }
      if (caps.length < 100) caps.push({ frame: f.name, teks: s.slice(0, 60), size });
    }
    // pemisah
    const m = (s.match(/·/g) || []).length;
    const p = (s.match(/\|/g) || []).length;
    const b = (s.match(/•/g) || []).length;
    const d = (s.match(/\s-\s/g) || []).length;
    sepCount.middot += m; sepCount.pipe += p; sepCount.bullet += b; sepCount.dashSep += d;
    if (p && sepSamples.pipe.length < 10) sepSamples.pipe.push(f.name + " :: " + s.slice(0, 70));
    if (b && sepSamples.bullet.length < 10) sepSamples.bullet.push(f.name + " :: " + s.slice(0, 70));
    if (d && sepSamples.dashSep.length < 10) sepSamples.dashSep.push(f.name + " :: " + s.slice(0, 70));
  }
}

// helper: cari badge terdekat dari sebuah node teks di dalam satu frame
function nearestBadge(frame, anchorRe, badgeRe) {
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] });
  const anchor = texts.find((t) => anchorRe.test(t.characters || ""));
  if (!anchor) return { adaAnchor: false };
  let best = null, bestD = 1e9;
  for (const t of texts) {
    if (!badgeRe.test(t.characters || "")) continue;
    const d = Math.hypot(t.x - anchor.x, t.y - anchor.y);
    if (d < bestD) { bestD = d; best = t; }
  }
  return { adaAnchor: true, anchor: anchor.characters, anchorXY: [Math.round(anchor.x), Math.round(anchor.y)], badge: best ? best.characters : null, jarak: best ? Math.round(bestD) : null };
}

// ide 87/88: badge di tiga frame Produk Game (mobile, desktop, Pencarian)
const badgeFrames = ["Produk Game (6 Langkah) — Light", "Produk Game — Desktop — Light", "Beranda — Pencarian “mlbb” — Light"];
const badges = {};
for (const name of badgeFrames) {
  const f = frames.find((x) => x.name === name);
  if (!f) { badges[name] = "FRAME-TIDAK-ADA"; continue; }
  badges[name] = {
    minus5_706: nearestBadge(f, /706 Diamonds/, /^-5%$/),
    terlaris_172: nearestBadge(f, /172 Diamonds/, /^Terlaris$/),
  };
}

// ide 89: harga coret "was" kartu flash di Beranda mobile/desktop + Pencarian
const flashFrames = ["Beranda — Light", "Beranda — Desktop — Light", "Beranda — Pencarian “mlbb” — Light"];
const flashWas = {};
for (const name of flashFrames) {
  const f = frames.find((x) => x.name === name);
  if (!f) { flashWas[name] = "FRAME-TIDAK-ADA"; continue; }
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const rp = texts.filter((t) => /^Rp[\d.]+$/.test((t.characters || "").trim())).map((t) => {
    let strike = null;
    try { strike = t.textDecoration; } catch { /* abaikan */ }
    return { teks: t.characters, coret: strike, y: Math.round(t.y) };
  });
  const kartu = texts.filter((t) => /Weekly Diamond Pass|70 Diamonds/.test(t.characters || "")).map((t) => t.characters);
  flashWas[name] = { kartuFlash: kartu, hargaRp: rp };
}

// ide 90: nilai countdown flash di semua frame yang menggambar timer
const countdowns = [];
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const timers = texts.filter((t) => /\d{2}:\d{2}:\d{2}/.test(t.characters || "")).map((t) => t.characters.trim());
  if (timers.length) countdowns.push({ frame: f.name, timer: timers });
}

return {
  frameCount: frames.length, totalNodes, totalTexts,
  duplicates,
  caps: { count: caps.length, items: caps },
  sepCount, sepSamples,
  opacityLow: { count: opacityLow.length, items: opacityLow },
  blendNonNormal: { count: blendNonNormal.length, items: blendNonNormal },
  dividers: { count: dividers.length, items: dividers },
  badges, flashWas, countdowns,
};
