// Probe geometri Figma batch s449 v2 (ide 85-90). Read-only.
// Pendekatan: dump rekursif manual per frame (tahan terhadap instance),
// lalu cocokkan lewat bounds, bukan lewat parent-chain.
const r1 = (n) => Math.round(n * 10) / 10;
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const F = (id) => figma.getNodeById(id);
const out = {};

// Kumpulkan semua node di bawah frame (rekursif, termasuk isi instance).
const dump = (frame) => {
  const list = [];
  const visit = (n) => {
    const b = n.absoluteBoundingBox;
    let fill = null;
    try { const f = n.fills && n.fills[0]; if (f && f.type === "SOLID") fill = hex(f.color); } catch { /* abaikan */ }
    list.push({
      type: n.type, name: n.name || "",
      x: b ? r1(b.x) : null, y: b ? r1(b.y) : null,
      w: b ? r1(b.width) : null, h: b ? r1(b.height) : null,
      fill, radius: typeof n.cornerRadius === "number" ? n.cornerRadius : null,
      chars: n.type === "TEXT" ? n.characters : null,
      fontSize: n.type === "TEXT" ? n.fontSize : null,
    });
    if (n.children) for (const c of n.children) visit(c);
  };
  visit(frame);
  return list;
};
const contains = (a, b) => a.x !== null && b.x !== null && b.x >= a.x - 1 && b.y >= a.y - 1 && (b.x + b.w) <= (a.x + a.w + 1) && (b.y + b.h) <= (a.y + a.h + 1);
const textsIn = (nodes, re) => nodes.filter((n) => n.type === "TEXT" && n.chars !== null && re.test(n.chars));

// 85: tile operator di Indeks Pulsa Mobile (54:22)
{
  const nodes = dump(F("54:22"));
  const want = { "TS": "#dc2626", "BU": "#1e3a8a", "IS": "#b45309", "XL": "#2563eb", "AX": "#7c3aed", "3": "#0f766e", "SF": "#be185d" };
  out.i85 = {};
  for (const [init, exp] of Object.entries(want)) {
    const t = textsIn(nodes, new RegExp("^" + init.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"))[0];
    let found = null;
    if (t) {
      const tiles = nodes.filter((n) => n.type !== "TEXT" && n.w >= 36 && n.w <= 60 && n.h >= 36 && n.h <= 60 && n.fill && contains(n, t));
      if (tiles.length) found = tiles[0].fill;
    }
    out.i85[init] = { figma: found, kode: exp, textFound: !!t };
  }
}

// 86: tile game di Beranda Light (1:2)
{
  const nodes = dump(F("1:2"));
  const want = { "ML": "#2563eb", "FF": "#0284c7", "GI": "#0f766e", "PB": "#334155", "HK": "#1e3a8a", "RB": "#334155", "VL": "#475569", "CM": "#2563eb", "WR": "#0284c7", "AV": "#0f766e", "DF": "#1e3a8a" };
  out.i86 = {};
  for (const [init, exp] of Object.entries(want)) {
    const cands = textsIn(nodes, new RegExp("^" + init + "$"));
    let found = null, textFound = cands.length > 0;
    for (const t of cands) {
      const tiles = nodes.filter((n) => n.type !== "TEXT" && n.w >= 36 && n.w <= 60 && n.h >= 36 && n.h <= 60 && n.fill && contains(n, t));
      if (tiles.length) { found = tiles[0].fill; break; }
    }
    out.i86[init] = { figma: found, kode: exp, textFound };
  }
}

// 87: radius tombol vs CSS (.btn 10, .btn.big 12)
const btnR = (fid, re) => {
  const nodes = dump(F(fid));
  const t = textsIn(nodes, re)[0];
  if (!t) return { textFound: false };
  const cands = nodes.filter((n) => n.type !== "TEXT" && n.radius !== null && n.h >= 28 && n.h <= 70 && n.w >= 60 && n.w <= 420 && contains(n, t));
  cands.sort((a, b) => (a.w * a.h) - (b.w * b.h));
  return cands.length ? { radius: cands[0].radius, w: cands[0].w, h: cands[0].h } : { textFound: true, container: null };
};
out.i87 = {
  beli: btnR("1:208", /^Beli Sekarang$/),
  pakai: btnR("1:208", /^Pakai$/),
  cekNama: btnR("2:116", /Cek Nama/),
  lacak: btnR("3:236", /^Cek$/),
  tutup: btnR("10:2", /^Tutup$/),
};

// 88: gap grid nominal vs CSS 10
const nomGaps = (fid) => {
  const nodes = dump(F(fid));
  const prices = textsIn(nodes, /^Rp[\d.]+$/);
  const cards = [];
  for (const t of prices) {
    const cands = nodes.filter((n) => n.type !== "TEXT" && n.w >= 80 && n.w <= 420 && n.h >= 50 && n.h <= 170 && contains(n, t));
    cands.sort((a, b) => (a.w * a.h) - (b.w * b.h));
    if (cands.length) {
      const c = cands[0];
      if (!cards.some((k) => Math.abs(k.x - c.x) < 2 && Math.abs(k.y - c.y) < 2)) cards.push({ x: c.x, y: c.y, w: c.w, h: c.h });
    }
  }
  cards.sort((p, q) => p.y - q.y || p.x - q.x);
  const rows = {};
  for (const c of cards) { const k = Math.round(c.y / 10); (rows[k] = rows[k] || []).push(c); }
  const hGaps = [], vGaps = [];
  const keys = Object.keys(rows).sort((a, b) => a - b);
  for (const k of keys) {
    const row = rows[k].sort((p, q) => p.x - q.x);
    for (let i = 1; i < row.length; i++) hGaps.push(r1(row[i].x - (row[i - 1].x + row[i - 1].w)));
  }
  for (let i = 1; i < keys.length; i++) {
    const prev = rows[keys[i - 1]][0], cur = rows[keys[i]][0];
    vGaps.push(r1(cur.y - (prev.y + prev.h)));
  }
  return { cards: cards.length, hGaps: hGaps.slice(0, 8), vGaps };
};
out.i88 = { mob: nomGaps("1:208"), desk: nomGaps("26:2") };

// 89: padding kartu langkah vs CSS 18
const stepPad = (fid) => {
  const nodes = dump(F(fid));
  const title = textsIn(nodes, /Masukkan User ID/)[0];
  if (!title) return { textFound: false };
  const cands = nodes.filter((n) => n.type !== "TEXT" && n.h >= 100 && n.h <= 420 && n.w >= 300 && contains(n, title));
  cands.sort((a, b) => (a.w * a.h) - (b.w * b.h));
  if (!cands.length) return { textFound: true, card: null };
  const card = cands[0];
  const num = textsIn(nodes, /^1$/).find((t) => Math.abs(t.y - title.y) < 24 && contains(card, t));
  const leftRef = num || title;
  return { card: { x: card.x, y: card.y, w: card.w, h: card.h }, padLeft: r1(leftRef.x - card.x), padTop: r1(title.y - card.y) };
};
out.i89 = { mob: stepPad("1:208"), desk: stepPad("26:2") };

// 90: tinggi input vs CSS 46
const inputH = (fid, re) => {
  const nodes = dump(F(fid));
  const t = textsIn(nodes, re)[0];
  if (!t) return { textFound: false };
  const cands = nodes.filter((n) => n.type !== "TEXT" && n.h >= 30 && n.h <= 70 && contains(n, t));
  cands.sort((a, b) => (a.w * a.h) - (b.w * b.h));
  return cands.length ? { h: cands[0].h, w: cands[0].w } : { textFound: true, container: null, textH: t.h };
};
out.i90 = {
  uid: inputH("1:208", /^12345678/),
  hp: inputH("2:2", /08x/),
  pln: inputH("2:116", /11–12 digit/),
  emailVoucher: inputH("3:118", /nama@email\.com/),
  promo: inputH("1:208", /Punya kode promo/),
};
return out;
