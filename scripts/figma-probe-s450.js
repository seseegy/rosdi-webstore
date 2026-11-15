// Read-only probe geometri Figma batch s450 (ide 81-89). Satu tarikan, output ringkas.
const r1 = (n) => Math.round(n * 10) / 10;
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const fillHex = (n) => { try { const f = n.fills && n.fills[0]; if (!f || f.type !== "SOLID") return null; return hex(f.color); } catch { return null; } };
const box = (n) => { const b = n.absoluteBoundingBox; return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; };
const F = (id) => figma.getNodeById(id);
const texts = (frame, re) => frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => re.test(t.characters));
const out = {};

// 81: jarak "Mulai Rp" ke tepi bawah kartu game (Beranda mobile + desktop)
out.i81 = {};
for (const [key, fid] of [["mobL", "1:2"], ["mobD", "1:105"], ["deskL", "20:2"], ["deskD", "21:2"]]) {
  const fr = F(fid);
  const list = [];
  for (const t of texts(fr, /^Mulai Rp/)) {
    let a = t.parent;
    while (a && a !== fr && !(a.type === "FRAME" && a.width <= 420 && a.height >= 60 && a.height <= 240)) a = a.parent;
    if (!a || a === fr) { list.push({ d: null }); continue; }
    const ab = a.absoluteBoundingBox, tb = t.absoluteBoundingBox;
    const name = a.findAllWithCriteria({ types: ["TEXT"] }).find((x) => x.fontSize === 14.5);
    list.push({ name: name ? name.characters.slice(0, 24) : null, d: r1((ab.y + ab.height) - (tb.y + tb.height)), cardH: r1(ab.height) });
  }
  out.i81[key] = list;
}

// 82: lebar kolom input UID vs Zone (Produk Game mobile)
out.i82 = {};
{
  const fr = F("1:208");
  const uidPh = texts(fr, /^12345678/)[0];
  const zonePh = texts(fr, /^1234$/)[0];
  const wOf = (t) => { if (!t) return null; let a = t.parent; while (a && a !== fr && a.type !== "FRAME") a = a.parent; return a && a !== fr ? r1(a.absoluteBoundingBox.width) : r1(t.absoluteBoundingBox.width); };
  out.i82 = { uidW: wOf(uidPh), zoneW: wOf(zonePh), uidY: uidPh ? r1(uidPh.absoluteBoundingBox.y) : null, zoneY: zonePh ? r1(zonePh.absoluteBoundingBox.y) : null, frameW: r1(fr.absoluteBoundingBox.width) };
}

// 83: tinggi kartu Langkah 1 mobile vs desktop (Produk Game)
out.i83 = {};
for (const [key, fid] of [["mobL", "1:208"], ["deskL", "26:2"]]) {
  const fr = F(fid);
  const title = texts(fr, /Masukkan User ID/)[0];
  let a = title ? title.parent : null;
  while (a && a !== fr && !(a.type === "FRAME" && a.height >= 100 && a.height <= 400)) a = a.parent;
  out.i83[key] = a && a !== fr ? { h: r1(a.absoluteBoundingBox.height), w: r1(a.absoluteBoundingBox.width) } : null;
}

// 84: baris Danamon vs BCA (Produk Game mobile + desktop)
out.i84 = {};
for (const [key, fid] of [["mobL", "1:208"], ["deskL", "26:2"]]) {
  const fr = F(fid);
  const grab = (nameRe) => {
    const t = texts(fr, nameRe)[0];
    if (!t) return null;
    let row = t.parent;
    return { text: t.characters.slice(0, 30), fill: fillHex(t), fontSize: t.fontSize, rowOpacity: row ? (row.opacity === undefined ? 1 : row.opacity) : null, rowFill: row ? fillHex(row) : null };
  };
  out.i84[key] = { danamon: grab(/Danamon/), status: grab(/Lagi perbaikan/), bca: grab(/BCA Virtual/) };
}

// 85: posisi ikon crumb "‹" vs judul di frame produk
out.i85 = {};
for (const [key, fid] of [["game", "1:208"], ["pulsa", "2:2"], ["pln", "2:116"], ["emoney", "3:2"], ["voucher", "3:118"]]) {
  const fr = F(fid);
  const back = texts(fr, /^‹$/)[0];
  if (!back) { out.i85[key] = null; continue; }
  const bb = back.absoluteBoundingBox;
  // judul = teks terbesar di baris yang sama (toleransi y +-14)
  const cands = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t !== back && Math.abs(t.absoluteBoundingBox.y - bb.y) < 16 && t.absoluteBoundingBox.x > bb.x);
  cands.sort((a, b) => b.fontSize - a.fontSize);
  const title = cands[0];
  out.i85[key] = title ? { back: box(back), title: title.characters.slice(0, 24), titleBox: box(title), dyCenter: r1((bb.y + bb.height / 2) - (title.absoluteBoundingBox.y + title.absoluteBoundingBox.height / 2)) } : { back: box(back), title: null };
}

// 86: gap vertikal antar baris metode (Produk Game mobile + desktop)
out.i86 = {};
for (const [key, fid] of [["mobL", "1:208"], ["deskL", "26:2"]]) {
  const fr = F(fid);
  const names = ["QRIS", "GoPay", "DANA", "OVO", "ShopeePay", "BCA Virtual Account", "Mandiri Virtual Account", "BRI Virtual Account", "Danamon Virtual Account", "Alfamart", "Indomaret", "Pulsa Telkomsel", "Pulsa XL"];
  const ys = [];
  for (const n of names) { const t = texts(fr, new RegExp("^" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"))[0]; if (t) ys.push({ n, y: r1(t.absoluteBoundingBox.y) }); }
  const gaps = [];
  for (let i = 1; i < ys.length; i++) gaps.push(r1(ys[i].y - ys[i - 1].y));
  out.i86[key] = { found: ys.length, gaps };
}

// 87: lebar progress bar flash mobile vs desktop
out.i87 = {};
for (const [key, fid] of [["mobL", "1:2"], ["deskL", "20:2"]]) {
  const fr = F(fid);
  // track = RECTANGLE tinggi 6 di area flash; fill = anak/rect biru di dalamnya
  const rects = fr.findAllWithCriteria({ types: ["RECTANGLE"] }).filter((n) => Math.abs(n.height - 6) < 0.6);
  const rows = rects.map((n) => { const b = box(n); return { w: b.w, x: b.x, y: b.y, fill: fillHex(n) }; });
  out.i87[key] = rows.slice(0, 6);
}

// 88: ukuran font nama operator di kartu indeks Pulsa (Beranda)
out.i88 = {};
{
  const fr = F("1:2");
  const names = ["Telkomsel", "by.U", "Indosat", "XL", "Axis", "Tri", "Smartfren"];
  const res = {};
  for (const n of names) {
    const t = texts(fr, new RegExp("^" + n + "$"))[0];
    // nama operator ada di kartu indeks Pulsa (teks p-sub), bukan di judul kartu game
    res[n] = t ? { fontSize: t.fontSize, y: r1(t.absoluteBoundingBox.y) } : null;
  }
  out.i88.beranda = res;
  // indeks Pulsa mobile: kartu operator punya p-name
  const idx = F("54:22");
  const res2 = {};
  for (const n of ["Telkomsel", "by.U", "Indosat", "XL", "Axis", "Tri", "Smartfren"]) {
    const t = texts(idx, new RegExp("^" + n + "$"))[0];
    res2[n] = t ? { fontSize: t.fontSize } : null;
  }
  out.i88.indeksPulsaMob = res2;
}

// 89: warna background hero Dark vs #172F5E
out.i89 = {};
{
  const fr = F("1:105");
  const heroText = texts(fr, /Top up, harga final/)[0];
  let hero = null;
  if (heroText) {
    let a = heroText.parent;
    while (a && a !== fr) { if (a.type === "FRAME" || a.type === "RECTANGLE") { hero = a; break; } a = a.parent; }
  }
  // fallback: rect besar ber-radius di area atas
  if (!hero) {
    const c = fr.findAllWithCriteria({ types: ["RECTANGLE"] }).filter((n) => n.width > 300 && n.height > 100 && n.absoluteBoundingBox.y < 400);
    hero = c[0] || null;
  }
  out.i89 = hero ? { fill: fillHex(hero), w: r1(hero.absoluteBoundingBox.width), h: r1(hero.absoluteBoundingBox.height) } : null;
}

return out;
