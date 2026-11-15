// Probe lanjutan Figma s452 (ide 45, 47, 48-mobile, 50, 51, 52-detail, 57, 58). Read-only.
const r1 = (n) => Math.round(n * 10) / 10;
const box = (n) => { const b = n.absoluteBoundingBox; return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; };
const byId = (id) => figma.getNodeById(id);
const out = {};

// 45b: semua teks Rp di Token PLN Desktop Light + struktur parent terdekat
{
  const fr = byId("30:2");
  const rows = [];
  for (const t of fr.findAllWithCriteria({ types: ["TEXT"] })) {
    if (!/Rp/.test(t.characters)) continue;
    let a = t.parent, chain = [];
    while (a && a !== fr && chain.length < 4) { chain.push(a.type + ":" + a.name + " " + r1(a.absoluteBoundingBox.width) + "x" + r1(a.absoluteBoundingBox.height)); a = a.parent; }
    rows.push({ text: t.characters.slice(0, 30), tb: box(t), chain });
  }
  out.i45b = rows.slice(0, 14);
}

// 47b: kartu langkah mobile — cari judul langkah lalu naik ke ancestor FRAME terdekat berlebar ~358
{
  const res = {};
  for (const [key, id] of [["mlbb", "1:208"], ["pulsa", "2:2"], ["pln", "2:116"], ["dana", "3:2"], ["gp", "3:118"]]) {
    const fr = byId(id);
    const widths = {};
    for (const t of fr.findAllWithCriteria({ types: ["TEXT"] })) {
      if (!/Masukkan|Pilih Nominal|Jumlah Pembelian|Pilih Pembayaran|Detail Kontak|Kode Promo/.test(t.characters)) continue;
      let a = t.parent;
      while (a && a !== fr) {
        if (a.type === "FRAME" && a.absoluteBoundingBox.width >= 300 && a.absoluteBoundingBox.width <= 390) { widths[r1(a.absoluteBoundingBox.width)] = (widths[r1(a.absoluteBoundingBox.width)] || 0) + 1; break; }
        a = a.parent;
      }
    }
    res[key] = { frame: fr.name, widths };
  }
  out.i47b = res;
}

// 48b: jumlah "Mulai Rp" di Beranda mobile Light
{
  const fr = byId("1:2");
  out.i48b = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Mulai Rp/.test(t.characters.trim())).map((t) => t.characters.trim());
}

// 50b: CTA "Mulai top up" (case-insensitive) mobile vs desktop
{
  const res = {};
  for (const [key, id] of [["mobLight", "1:2"], ["mobDark", "1:105"], ["deskLight", "20:2"], ["deskDark", "21:2"]]) {
    const fr = byId(id);
    const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /mulai top up/i.test(x.characters.trim()));
    res[key] = t ? { text: t.characters.trim(), size: t.fontSize, weight: t.fontName.style, box: box(t) } : "tidak ketemu";
  }
  out.i50b = res;
}

// 51b: input + tombol Lacak di Cek Desktop — cari rect/frame setinggi 46 di sekitar teks
{
  const fr = byId("36:2");
  const findBox = (t) => {
    if (!t) return null;
    let a = t.parent;
    while (a && a !== fr) {
      const b = a.absoluteBoundingBox;
      if ((a.type === "FRAME" || a.type === "RECTANGLE") && b.height >= 40 && b.height <= 60) return { node: a.type + ":" + a.name, box: box(a) };
      a = a.parent;
    }
    return { textOnly: box(t) };
  };
  const inp = fr.findAllWithCriteria({ types: ["TEXT"] }).find((t) => /RSD-/.test(t.characters));
  const btn = fr.findAllWithCriteria({ types: ["TEXT"] }).find((t) => t.characters.trim() === "Lacak");
  // lebar kartu input: ancestor FRAME terlebar yang memuat input
  let cardW = null;
  if (inp) {
    let a = inp.parent;
    while (a && a !== fr) { if (a.type === "FRAME" && a.absoluteBoundingBox.width >= 400) { cardW = box(a); break; } a = a.parent; }
  }
  out.i51b = { input: findBox(inp), lacakBtn: findBox(btn), inputCard: cardW };
}

// 52b: detail node tersembunyi di Beranda
{
  const res = {};
  for (const [key, id] of [["mobLight", "1:2"], ["deskLight", "20:2"]]) {
    const fr = byId(id);
    const hidden = [];
    const walk = (n, path) => {
      if (n.visible === false) hidden.push({ name: n.name, type: n.type, path, box: n.absoluteBoundingBox ? box(n) : null });
      if ("children" in n) for (const c of n.children) walk(c, path + "/" + n.name);
    };
    walk(fr, "");
    res[key] = hidden;
  }
  out.i52b = res;
}

// 57b: kartu hasil Lacak di Cek Desktop — dump semua teks + cari kartu berisi timeline
{
  const fr = byId("36:2");
  out.i57b = {
    texts: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.slice(0, 50)),
    frameW: r1(fr.width),
  };
  // cari ancestor FRAME dari teks "Pesanan dibuat" / "Pembayaran diterima"
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /Pesanan dibuat|Pembayaran diterima|Item terkirim/.test(x.characters));
  if (t) {
    let a = t.parent, chain = [];
    while (a && a !== fr && chain.length < 5) { chain.push(a.type + ":" + a.name + " " + r1(a.absoluteBoundingBox.width) + "x" + r1(a.absoluteBoundingBox.height)); a = a.parent; }
    out.i57b.timelineChain = chain;
  }
}

// 58b: kartu sukses di Sukses Desktop — dump teks + ancestor dari "Pesanan diterima"
{
  const fr = byId("36:166");
  out.i58b = {
    frame: fr.name,
    texts: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.slice(0, 50)),
  };
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /Pesanan diterima/i.test(x.characters));
  if (t) {
    let a = t.parent, chain = [];
    while (a && a !== fr && chain.length < 5) { chain.push(a.type + ":" + a.name + " " + r1(a.absoluteBoundingBox.width) + "x" + r1(a.absoluteBoundingBox.height)); a = a.parent; }
    out.i58b.chain = chain;
  } else out.i58b.chain = "teks 'Pesanan diterima' tidak ketemu";
}
return out;
