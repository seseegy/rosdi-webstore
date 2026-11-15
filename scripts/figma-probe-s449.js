// Probe geometri Figma batch s449 (ide 83-90). Read-only.
const r1 = (n) => Math.round(n * 10) / 10;
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const box = (n) => { const b = n.absoluteBoundingBox; return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; };
const F = (id) => figma.getNodeById(id);
const texts = (frame, re) => frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => re.test(t.characters));
const allTexts = (frame) => frame.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
const out = {};

// 83: isi frame Sukses mobile (4:2) vs SuccessPage di kode
out.i83 = { texts: allTexts(F("4:2")).slice(0, 60) };

// 84: isi frame Cek mobile (3:236) vs CekPage di kode
out.i84 = { texts: allTexts(F("3:236")).slice(0, 60) };

// 85: warna tile operator di Indeks Pulsa Mobile (54:22) vs data.js
const tileFill = (frame, initials) => {
  const cands = frame.findAllWithCriteria({ types: ["TEXT"] }).filter((x) => x.characters.trim() === initials);
  for (const t of cands) {
    let a = t.parent;
    while (a && a !== frame) {
      if ((a.type === "FRAME" || a.type === "RECTANGLE") && a.fills && a.fills[0] && a.fills[0].type === "SOLID") {
        const b = a.absoluteBoundingBox;
        if (b.width >= 36 && b.width <= 60 && b.height >= 36 && b.height <= 60) return hex(a.fills[0].color);
      }
      a = a.parent;
    }
  }
  return null;
};
out.i85 = {};
{
  const fr = F("54:22");
  const want = { "TS": "#dc2626", "BU": "#1e3a8a", "IS": "#b45309", "XL": "#2563eb", "AX": "#7c3aed", "3": "#0f766e", "SF": "#be185d" };
  for (const [init, exp] of Object.entries(want)) out.i85[init] = { figma: tileFill(fr, init), kode: exp };
}

// 86: warna tile game di Beranda Light (1:2) vs data.js
out.i86 = {};
{
  const fr = F("1:2");
  const want = { "ML": "#2563eb", "FF": "#0284c7", "GI": "#0f766e", "PB": "#334155", "HK": "#1e3a8a", "RB": "#334155", "VL": "#475569", "CM": "#2563eb", "WR": "#0284c7", "AV": "#0f766e", "DF": "#1e3a8a" };
  for (const [init, exp] of Object.entries(want)) out.i86[init] = { figma: tileFill(fr, init), kode: exp };
}

// 87: radius tombol di frame produk vs CSS (.btn 10, .btn.big 12)
const btnRadius = (frame, re) => {
  const t = texts(frame, re)[0];
  if (!t) return null;
  let a = t.parent;
  while (a && a !== frame) {
    if ((a.type === "FRAME" || a.type === "RECTANGLE") && typeof a.cornerRadius === "number") return { radius: a.cornerRadius, w: r1(a.absoluteBoundingBox.width), h: r1(a.absoluteBoundingBox.height) };
    a = a.parent;
  }
  return null;
};
out.i87 = {
  beli: btnRadius(F("1:208"), /^Beli Sekarang$/),
  pakai: btnRadius(F("1:208"), /^Pakai$/),
  cekNama: btnRadius(F("2:116"), /Cek Nama/),
  lacak: btnRadius(F("3:236"), /^Cek$/),
  tutup: btnRadius(F("10:2"), /^Tutup$/),
};

// 88: gap grid nominal di Produk Game mobile (1:208) + desktop (26:2) vs CSS 10
const nomGaps = (frame) => {
  const cards = [];
  for (const t of frame.findAllWithCriteria({ types: ["TEXT"] })) {
    if (!/^Rp[\d.]+$/.test(t.characters.trim())) continue;
    let a = t.parent;
    while (a && a !== frame && !(a.type === "FRAME" && a.width >= 80 && a.width <= 420 && a.height >= 50 && a.height <= 160)) a = a.parent;
    if (a && a !== frame) {
      const b = a.absoluteBoundingBox;
      if (!cards.some((c) => Math.abs(c.x - b.x) < 2 && Math.abs(c.y - b.y) < 2)) cards.push({ x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) });
    }
  }
  cards.sort((p, q) => p.y - q.y || p.x - q.x);
  const rows = {};
  for (const c of cards) { const k = Math.round(c.y / 10); (rows[k] = rows[k] || []).push(c); }
  const hGaps = [], vGaps = [];
  const rowKeys = Object.keys(rows).sort((a, b) => a - b);
  for (const k of rowKeys) {
    const row = rows[k].sort((p, q) => p.x - q.x);
    for (let i = 1; i < row.length; i++) hGaps.push(r1(row[i].x - (row[i - 1].x + row[i - 1].w)));
  }
  for (let i = 1; i < rowKeys.length; i++) {
    const prev = rows[rowKeys[i - 1]][0], cur = rows[rowKeys[i]][0];
    vGaps.push(r1(cur.y - (prev.y + prev.h)));
  }
  return { cards: cards.length, hGaps: hGaps.slice(0, 6), vGaps };
};
out.i88 = { mob: nomGaps(F("1:208")), desk: nomGaps(F("26:2")) };

// 89: padding kartu langkah di Produk Game mobile (1:208) + desktop (26:2) vs CSS 18
const stepPad = (frame) => {
  const title = texts(frame, /Masukkan User ID/)[0];
  if (!title) return null;
  let a = title.parent;
  while (a && a !== frame && !(a.type === "FRAME" && a.height >= 100 && a.height <= 400)) a = a.parent;
  if (!a || a === frame) return null;
  const cb = a.absoluteBoundingBox, tb = title.absoluteBoundingBox;
  const num = texts(frame, /^1$/).find((t) => Math.abs(t.absoluteBoundingBox.y - tb.y) < 20);
  const nb = num ? num.absoluteBoundingBox : null;
  return { card: box(a), padLeft: nb ? r1(nb.x - cb.x) : r1(tb.x - cb.x), padTop: r1(tb.y - cb.y) };
};
out.i89 = { mob: stepPad(F("1:208")), desk: stepPad(F("26:2")) };

// 90: tinggi input di frame produk vs CSS 46
const inputH = (frame, re) => {
  const t = texts(frame, re)[0];
  if (!t) return null;
  let a = t.parent;
  while (a && a !== frame) {
    if (a.type === "FRAME" || a.type === "RECTANGLE") {
      const b = a.absoluteBoundingBox;
      if (b.height >= 30 && b.height <= 70) return { h: r1(b.height), w: r1(b.width) };
    }
    a = a.parent;
  }
  return { textH: r1(t.absoluteBoundingBox.height) };
};
out.i90 = {
  uid: inputH(F("1:208"), /^12345678/),
  hp: inputH(F("2:2"), /08x/),
  pln: inputH(F("2:116"), /11–12 digit/),
  emailVoucher: inputH(F("3:118"), /nama@email\.com/),
  promo: inputH(F("1:208"), /Punya kode promo/),
};
return out;
