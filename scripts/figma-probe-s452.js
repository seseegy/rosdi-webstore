// Probe geometri Figma batch s452 (ide 45-58, 88). Read-only.
const r1 = (n) => Math.round(n * 10) / 10;
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const box = (n) => { const b = n.absoluteBoundingBox; return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; };
const frames = figma.currentPage.children.filter((c) => c.type === "FRAME");
const byName = (re) => frames.find((f) => re.test(f.name));
const out = {};
out.inventory = frames.map((f) => ({ id: f.id, name: f.name, x: r1(f.x), y: r1(f.y), w: r1(f.width), h: r1(f.height) }));

// 45: jarak teks harga ke tepi kanan kartu nominal, Token PLN Desktop Light
{
  const fr = byName(/Token PLN.*Desktop.*Light/);
  const res = [];
  if (fr) {
    for (const t of fr.findAllWithCriteria({ types: ["TEXT"] })) {
      if (!/^Rp[\d.]+$/.test(t.characters.trim())) continue;
      let a = t.parent;
      while (a && a !== fr && !(a.type === "FRAME" && a.width >= 150 && a.width <= 320 && a.height >= 50 && a.height <= 140)) a = a.parent;
      if (a && a !== fr) {
        const cb = a.absoluteBoundingBox, tb = t.absoluteBoundingBox;
        res.push({ price: t.characters.trim(), gapRight: r1(cb.x + cb.width - (tb.x + tb.width)), cardW: r1(cb.width) });
      }
    }
  }
  out.i45 = res.slice(0, 8);
}

// 46: warna hardcode (fill SOLID tanpa boundVariables) di luar token + warna data
{
  const tokens = new Set(["#f6f8fb","#ffffff","#0f172a","#64748b","#94a3b8","#e2e8f0","#2563eb","#eff6ff","#f8fafc","#059669","#0b1220","#131f36","#f1f5f9","#22314f","#3b82f6","#16294d","#0e1930","#34d399","#1d4ed8","#1e3a8a","#172f5e","#dbeafe","#c7d7fb","#ecfdf5","#fef2f2","#fffbeb","#eef2f7","#5b6b82","#9db0c9","#047857","#b91c1c","#f87171","#33161a","#b45309","#fbbf24","#2e230a","#0c2b21","#60a5fa"]);
  const dataColors = new Set(["#dc2626","#0284c7","#0f766e","#334155","#1e3a8a","#475569","#7c3aed","#be185d","#b45309","#4c1d95","#c2410c","#2563eb"]);
  const bad = {};
  let checked = 0;
  const walk = (n) => {
    if (n.fills) for (const f of n.fills) {
      if (f.type === "SOLID" && f.visible !== false) {
        checked++;
        const h = hex(f.color);
        const bound = f.boundVariables && f.boundVariables.color;
        if (!bound && !tokens.has(h) && !dataColors.has(h)) bad[h] = (bad[h] || 0) + 1;
      }
    }
    if ("children" in n) for (const c of n.children) walk(c);
  };
  for (const f of frames) walk(f);
  out.i46 = { checkedFills: checked, nonTokenNonData: bad };
}

// 47: lebar kartu Langkah di frame produk mobile
{
  const res = {};
  for (const [key, re] of [["mlbb", /Produk Game.*Light/], ["pulsa", /Pulsa.*Telkomsel.*Light/], ["pln", /Token PLN.*Light/], ["dana", /Saldo DANA.*Light/], ["gp", /Voucher Google Play.*Light/]]) {
    const fr = byName(re);
    if (!fr) { res[key] = "frame tidak ketemu"; continue; }
    const widths = {};
    for (const t of fr.findAllWithCriteria({ types: ["TEXT"] })) {
      if (!/^(Masukkan|Pilih|Jumlah)/.test(t.characters.trim())) continue;
      let a = t.parent;
      while (a && a !== fr && !(a.type === "FRAME" && a.height >= 100 && a.height <= 500)) a = a.parent;
      if (a && a !== fr) widths[r1(a.absoluteBoundingBox.width)] = (widths[r1(a.absoluteBoundingBox.width)] || 0) + 1;
    }
    res[key] = { frame: fr.name, widths };
  }
  out.i47 = res;
}

// 48: jumlah kartu game Beranda Desktop (teks "Mulai Rp")
{
  const fr = byName(/Beranda.*Desktop.*Light/);
  out.i48 = fr ? { frame: fr.name, mulaiRp: fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Mulai Rp/.test(t.characters.trim())).map((t) => t.characters.trim()) } : "frame tidak ketemu";
}

// 49: warna ikon "✓" kartu trust
{
  const res = {};
  for (const [key, re] of [["homeLight", /^Beranda.*Light$/], ["homeDark", /^Beranda.*Dark$/], ["homeDeskLight", /Beranda.*Desktop.*Light/], ["homeDeskDark", /Beranda.*Desktop.*Dark/]]) {
    const fr = byName(re);
    if (!fr) { res[key] = "frame tidak ketemu"; continue; }
    const checks = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.trim() === "✓");
    res[key] = checks.map((t) => ({ fill: t.fills && t.fills[0] ? hex(t.fills[0].color) : null, size: t.fontSize, box: box(t) })).slice(0, 4);
  }
  out.i49 = res;
}

// 50: ukuran font CTA "Mulai Top Up" mobile vs desktop
{
  const res = {};
  for (const [key, re] of [["mobLight", /^Beranda.*Light$/], ["mobDark", /^Beranda.*Dark$/], ["deskLight", /Beranda.*Desktop.*Light/], ["deskDark", /Beranda.*Desktop.*Dark/]]) {
    const fr = byName(re);
    if (!fr) { res[key] = "frame tidak ketemu"; continue; }
    const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => x.characters.trim() === "Mulai Top Up");
    res[key] = t ? { size: t.fontSize, weight: t.fontName.style, box: box(t) } : "teks tidak ketemu";
  }
  out.i50 = res;
}

// 51: lebar input + tombol Lacak di Cek Desktop
{
  const fr = byName(/Cek Transaksi.*Desktop.*Light/);
  if (!fr) out.i51 = "frame tidak ketemu";
  else {
    const inp = fr.findAllWithCriteria({ types: ["TEXT"] }).find((t) => /RSD-/.test(t.characters));
    const btn = fr.findAllWithCriteria({ types: ["TEXT"] }).find((t) => t.characters.trim() === "Lacak");
    const meas = (t) => {
      if (!t) return null;
      let a = t.parent;
      while (a && a !== fr && !(a.type === "FRAME" && a.height >= 30 && a.height <= 70)) a = a.parent;
      return a && a !== fr ? box(a) : { textOnly: box(t) };
    };
    out.i51 = { frame: fr.name, frameW: r1(fr.width), input: meas(inp), lacakBtn: meas(btn) };
  }
}

// 52: node tersembunyi di Beranda
{
  const res = {};
  for (const [key, re] of [["mobLight", /^Beranda.*Light$/], ["mobDark", /^Beranda.*Dark$/], ["deskLight", /Beranda.*Desktop.*Light/], ["deskDark", /Beranda.*Desktop.*Dark/]]) {
    const fr = byName(re);
    if (!fr) { res[key] = "frame tidak ketemu"; continue; }
    const hidden = [];
    const walk = (n) => { if (n.visible === false) hidden.push({ name: n.name, type: n.type }); if ("children" in n) for (const c of n.children) walk(c); };
    walk(fr);
    res[key] = { count: hidden.length, sample: hidden.slice(0, 5) };
  }
  out.i52 = res;
}

// 53-56: hitung nominal di frame desktop (cocokkan harga data.js)
{
  const countPrices = (fr, prices) => {
    if (!fr) return "frame tidak ketemu";
    const found = new Set();
    for (const t of fr.findAllWithCriteria({ types: ["TEXT"] })) {
      const m = t.characters.trim().match(/^Rp([\d.]+)$/);
      if (m && prices.includes(m[1])) found.add(m[1]);
    }
    return { frame: fr.name, found: [...found].sort(), n: found.size };
  };
  out.i53 = countPrices(byName(/Pulsa Telkomsel.*Desktop.*Light/), ["6.500","12.297","16.705","21.768","26.830","31.892","51.907","74.757","97.968","148.737","197.828"]);
  out.i54 = countPrices(byName(/Token PLN.*Desktop.*Light/), ["22.500","52.500","102.500","202.500","502.500","1.002.500"]);
  out.i55 = countPrices(byName(/Voucher Google Play.*Desktop.*Light/), ["5.500","11.000","22.000","55.000","110.000","330.000"]);
  out.i56 = countPrices(byName(/Saldo DANA.*Desktop.*Light/), ["10.292","20.492","25.492","51.092","75.742","99.942","150.792","200.692","501.092"]);
}

// 57: lebar kartu hasil Lacak di Cek Desktop
{
  const fr = byName(/Cek Transaksi.*Desktop.*Light/);
  if (!fr) out.i57 = "frame tidak ketemu";
  else {
    const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /Pesanan dibuat/.test(x.characters));
    let card = null;
    if (t) {
      let a = t.parent;
      while (a && a !== fr && !(a.type === "FRAME" && a.width >= 400 && a.width <= 900)) a = a.parent;
      card = a && a !== fr ? box(a) : null;
    }
    const inputCard = (() => {
      const inp = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /RSD-/.test(x.characters));
      if (!inp) return null;
      let a = inp.parent;
      while (a && a !== fr && !(a.type === "FRAME" && a.width >= 400 && a.width <= 900)) a = a.parent;
      return a && a !== fr ? box(a) : null;
    })();
    out.i57 = { resultCard: card, inputCard };
  }
}

// 58: lebar kartu sukses di Sukses Desktop
{
  const fr = byName(/Sukses.*Desktop.*Light/);
  if (!fr) out.i58 = "frame tidak ketemu";
  else {
    const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /Pesanan diterima/.test(x.characters));
    let card = null;
    if (t) {
      let a = t.parent;
      while (a && a !== fr && !(a.type === "FRAME" && a.width >= 400 && a.width <= 900)) a = a.parent;
      card = a && a !== fr ? box(a) : null;
    }
    out.i58 = { frame: fr.name, frameW: r1(fr.width), successCard: card };
  }
}

// 88: teks di frame Dark dengan fill #94A3B8 (sub) berukuran >= 14 (teks utama?)
{
  const res = {};
  for (const f of frames) {
    if (!/Dark/.test(f.name)) continue;
    const sus = [];
    for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
      if (t.fills && t.fills[0] && t.fills[0].type === "SOLID" && hex(t.fills[0].color) === "#94a3b8" && t.fontSize >= 14) {
        sus.push({ text: t.characters.slice(0, 40), size: t.fontSize });
      }
    }
    if (sus.length) res[f.name] = sus.slice(0, 8);
  }
  out.i88 = res;
}
return out;
