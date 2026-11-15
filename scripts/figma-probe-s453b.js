// Probe Figma s453b (ide 59, 61-70) — pencocokan BERDASARKAN NAMA frame (cross-check
// terhadap figma-probe-s453.js yang memakai ID node hardcode). Read-only.
const r1 = (n) => Math.round(n * 10) / 10;
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const frames = figma.currentPage.children.filter((c) => c.type === "FRAME");
const byName = (re) => frames.filter((f) => re.test(f.name));
const out = {};
out.inventory = frames.map((f) => ({ name: f.name, x: r1(f.x), y: r1(f.y), w: r1(f.width), h: r1(f.height) }));
const textsOf = (fr) => fr.findAllWithCriteria({ types: ["TEXT"] })
  .map((t) => ({ txt: t.characters, fill: t.fills && t.fills[0] && t.fills[0].type === "SOLID" ? hex(t.fills[0].color) : null,
    size: t.fontSize }))
  .filter((t) => t.txt.trim() !== "");
const uniq = (arr) => [...new Set(arr)];

// i59: harga coret 706 Diamonds lintas frame
{
  const res = {};
  for (const fr of frames) {
    const ts = textsOf(fr);
    if (ts.some((t) => /706 Diamonds/.test(t.txt))) {
      res[fr.name] = {
        was185: ts.filter((t) => t.txt.includes("185.000")).map((t) => t.txt),
        price1755: ts.filter((t) => t.txt.includes("175.500")).map((t) => t.txt),
      };
    }
  }
  out.i59 = res;
}
// i61: Frame Tagihan — nama + urutan kategori
{
  const res = {};
  for (const fr of byName(/Tagihan/)) {
    res[fr.name] = uniq(textsOf(fr).map((t) => t.txt)).filter((s) => /PLN|PDAM|BPJS|Telkom|TV Kabel|Multifinance|PBB|IndiHome/i.test(s));
  }
  out.i61 = res;
}
// i62: Frame Modal Masuk — semua teks
{
  const res = {};
  for (const fr of byName(/Modal Masuk|Masuk/)) res[fr.name] = uniq(textsOf(fr).map((t) => t.txt));
  out.i62 = res;
}
// i63: Frame 404 — semua teks (atau bukti tidak ada)
{
  const res = {};
  const hits = byName(/404|Error|Gagal/i);
  for (const fr of hits) res[fr.name] = uniq(textsOf(fr).map((t) => t.txt));
  out.i63 = { framesMatched: hits.map((f) => f.name), texts: res };
}
// i64: Frame Indeks Pulsa — kartu operator
{
  const res = {};
  for (const fr of byName(/Pulsa/)) {
    const names = uniq(textsOf(fr).map((t) => t.txt)).filter((s) => /Telkomsel|by\.?U|Indosat|XL|Axis|Tri|Smartfren/i.test(s));
    if (names.length >= 5) res[fr.name] = names;
  }
  out.i64 = res;
}
// i65: Frame Paket Data — kartu operator
{
  const res = {};
  for (const fr of byName(/Paket Data|Data/)) {
    const names = uniq(textsOf(fr).map((t) => t.txt)).filter((s) => /Telkomsel|by\.?U|Indosat|XL|Axis|Tri|Smartfren/i.test(s));
    if (names.length) res[fr.name] = names;
  }
  out.i65 = res;
}
// i66: Frame Sukses mobile — nomor order + tombol Salin
{
  const res = {};
  for (const fr of byName(/Sukses/)) {
    const ts = textsOf(fr);
    res[fr.name] = {
      hasOrderRef: ts.filter((t) => /RSD-/.test(t.txt)).map((t) => t.txt),
      hasSalin: ts.filter((t) => /Salin/i.test(t.txt)).map((t) => t.txt),
    };
  }
  out.i66 = res;
}
// i67: Frame Produk Game Desktop — hitung kartu nominal MLBB
{
  const res = {};
  for (const fr of byName(/Produk Game.*Desktop|Desktop.*Produk Game|Game.*Desktop/)) {
    const ts = textsOf(fr);
    const noms = ts.filter((t) => /Diamonds$/.test(t.txt.trim())).map((t) => t.txt);
    res[fr.name] = { nominalTexts: uniq(noms), count: noms.length };
  }
  out.i67 = res;
}
// i68: Beranda Desktop — progress bar flash
{
  const res = {};
  for (const fr of byName(/Beranda.*Desktop|Desktop.*Beranda/)) {
    const ts = textsOf(fr);
    const bars = [];
    for (const n of fr.findAllWithCriteria({ types: ["RECTANGLE"] })) {
      const b = n.absoluteBoundingBox;
      if (b && b.height >= 4 && b.height <= 10 && b.width > 40) bars.push({ w: r1(b.width), h: r1(b.height), fill: n.fills && n.fills[0] && n.fills[0].type === "SOLID" ? hex(n.fills[0].color) : null, name: n.name });
    }
    res[fr.name] = { terjual: ts.filter((t) => /Terjual/.test(t.txt)).map((t) => t.txt), progressBars: bars.slice(0, 10) };
  }
  out.i68 = res;
}
// i69: Beranda Desktop — hitung kartu seksi
{
  const res = {};
  for (const fr of byName(/Beranda.*Desktop|Desktop.*Beranda/)) {
    const ts = textsOf(fr);
    res[fr.name] = uniq(ts.map((t) => t.txt)).filter((s) => /^(Pulsa Reguler|Paket Data|Token PLN|Tagihan Pascabayar|Saldo DANA|Saldo GoPay|Saldo OVO|Saldo ShopeePay|Voucher Google Play|Steam Wallet IDR|PlayStation Network ID)$/.test(s.trim()));
  }
  out.i69 = res;
}
// i70: Token PLN Desktop — peringatan token tak bisa dibatalkan
{
  const res = {};
  for (const fr of byName(/Token PLN.*Desktop|Desktop.*Token PLN/)) {
    res[fr.name] = textsOf(fr).filter((t) => /batal/i.test(t.txt));
  }
  out.i70 = res;
}
return out;
