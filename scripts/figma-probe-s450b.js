// Read-only probe lanjutan s450: perbaiki i81/i82/i83/i84m/i86m/i87 (probe 1 gagal cocok ancestor).
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const out = {};

// i81 retry: ancestor longgar (FRAME/INSTANCE/GROUP/COMPONENT, 100<=w<=420, 60<=h<=260)
out.i81 = {};
for (const [key, fid] of [["mobL", "1:2"], ["deskL", "20:2"]]) {
  const fr = F(fid);
  const list = [];
  for (const t of fr.findAllWithCriteria({ types: ["TEXT"] }).filter((x) => /^Mulai Rp/.test(x.characters))) {
    let a = t.parent;
    while (a && a !== fr && !((a.type === "FRAME" || a.type === "INSTANCE" || a.type === "GROUP" || a.type === "COMPONENT") && a.width >= 100 && a.width <= 420 && a.height >= 60 && a.height <= 260)) a = a.parent;
    if (!a || a === fr) { list.push({ d: null, ancType: t.parent ? t.parent.type : null }); continue; }
    const ab = a.absoluteBoundingBox, tb = t.absoluteBoundingBox;
    const name = a.findAllWithCriteria({ types: ["TEXT"] }).find((x) => x.fontSize === 14.5);
    list.push({ name: name ? name.characters.slice(0, 24) : null, d: r1((ab.y + ab.height) - (tb.y + tb.height)), cardW: r1(ab.width), cardH: r1(ab.height), ancType: a.type });
  }
  out.i81[key] = list;
}

// i82 retry: kotak input = RECTANGLE h~46 di frame Produk Game mobile + label
out.i82 = {};
{
  const fr = F("1:208");
  const rects = fr.findAllWithCriteria({ types: ["RECTANGLE"] }).filter((n) => n.height >= 44 && n.height <= 48 && n.absoluteBoundingBox.y < 400);
  out.i82.inputRects = rects.map((n) => { const b = n.absoluteBoundingBox; return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; }).slice(0, 8);
  const labels = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^(User ID|Zone ID)$/.test(t.characters));
  out.i82.labels = labels.map((t) => { const b = t.absoluteBoundingBox; return { txt: t.characters, x: r1(b.x), y: r1(b.y) }; });
  const ph = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^(12345678|1234)$/.test(t.characters));
  out.i82.placeholders = ph.map((t) => { const b = t.absoluteBoundingBox; return { txt: t.characters, x: r1(b.x), y: r1(b.y), w: r1(b.width) }; });
}

// i83 retry + i84m + i86m: dump teks area Langkah 1 & metode di Produk Game mobile
out.i83m = {};
{
  const fr = F("1:208");
  const all = fr.findAllWithCriteria({ types: ["TEXT"] });
  out.i83m.stepTitles = all.filter((t) => /Langkah|Masukkan|Pilih|Jumlah|Detail|Kode/.test(t.characters)).map((t) => { const b = t.absoluteBoundingBox; return { txt: t.characters.slice(0, 40), fs: t.fontSize, x: r1(b.x), y: r1(b.y) }; }).slice(0, 20);
  // kartu Langkah 1 = ancestor FRAME dari teks "Masukkan User ID" (atau "User ID" label)
  const t1 = all.find((t) => /Masukkan User ID/.test(t.characters)) || all.find((t) => t.characters === "User ID");
  let card = null;
  if (t1) { let a = t1.parent; while (a && a !== fr && !(a.height >= 100 && a.height <= 420 && a.width >= 300)) a = a.parent; if (a && a !== fr) card = { h: r1(a.height), w: r1(a.width), type: a.type }; }
  out.i83m.step1card = card;
  out.i83m.step1titleFound = t1 ? t1.characters.slice(0, 40) : null;
}
out.i84m = {};
{
  const fr = F("1:208");
  const all = fr.findAllWithCriteria({ types: ["TEXT"] });
  out.i84m.payTexts = all.filter((t) => /Danamon|BCA|GoPay|QRIS|Lagi perbaikan|Alfamart|Pulsa Telkomsel/.test(t.characters)).map((t) => { const b = t.absoluteBoundingBox; return { txt: t.characters.slice(0, 44), fs: t.fontSize, x: r1(b.x), y: r1(b.y) }; }).slice(0, 24);
}
out.i86m = {};
{
  const fr = F("1:208");
  const all = fr.findAllWithCriteria({ types: ["TEXT"] });
  const names = ["QRIS", "GoPay", "DANA", "OVO", "ShopeePay", "BCA Virtual Account", "Mandiri Virtual Account", "BRI Virtual Account", "Danamon Virtual Account", "Alfamart", "Indomaret", "Pulsa Telkomsel", "Pulsa XL"];
  const found = [];
  for (const n of names) {
    const t = all.find((x) => x.characters === n) || all.find((x) => x.characters.indexOf(n) === 0);
    if (t) found.push({ n, txt: t.characters.slice(0, 40), y: r1(t.absoluteBoundingBox.y) });
  }
  out.i86m = found;
}

// i87 retry: lebar kartu flash vs track
out.i87 = {};
for (const [key, fid] of [["mobL", "1:2"], ["deskL", "20:2"]]) {
  const fr = F(fid);
  const tracks = fr.findAllWithCriteria({ types: ["RECTANGLE"] }).filter((n) => Math.abs(n.height - 6) < 0.6);
  const rows = [];
  for (const tr of tracks) {
    if (tr.fills && tr.fills[0] && tr.fills[0].color && Math.round(tr.fills[0].color.b * 255) === 235 && Math.round(tr.fills[0].color.r * 255) === 37) {
      // ini fill biru; cari track abu di y sama
      const tb = tr.absoluteBoundingBox;
      const track = tracks.find((n) => n !== tr && Math.abs(n.absoluteBoundingBox.y - tb.y) < 1);
      let card = tr.parent;
      while (card && card !== fr && !(card.width >= 200 && card.width <= 700 && card.height >= 100 && card.height <= 300)) card = card.parent;
      rows.push({ trackW: track ? r1(track.absoluteBoundingBox.width) : null, fillW: r1(tb.width), cardW: card && card !== fr ? r1(card.width) : null, ratio: track && card && card !== fr ? +(r1(track.absoluteBoundingBox.width) / r1(card.width)).toFixed(3) : null });
    }
  }
  out.i87[key] = rows;
}

// i83 desktop: kartu Langkah 1 di Produk Game Desktop
out.i83d = {};
{
  const fr = F("26:2");
  const all = fr.findAllWithCriteria({ types: ["TEXT"] });
  const t1 = all.find((t) => /Masukkan User ID/.test(t.characters)) || all.find((t) => t.characters === "User ID");
  let card = null;
  if (t1) { let a = t1.parent; while (a && a !== fr && !(a.height >= 100 && a.height <= 420 && a.width >= 300)) a = a.parent; if (a && a !== fr) card = { h: r1(a.height), w: r1(a.width), type: a.type }; }
  out.i83d = { titleFound: t1 ? t1.characters.slice(0, 40) : null, card };
}

return out;
