// Analisis s440 (kode saja): A per-satuan, D simulasi, F indeks, I riwayat, J pencarian.
// Dipakai bersama data Figma (figma-patterns-s440*.json) untuk verdict.
import {
  GAMES, OPERATORS, DATA_PACKAGES, PLN_ITEMS, EWALLETS, EMONEY_ITEMS,
  VOUCHERS, FLASH_SALE, calcTotals, payFee, ALL_PAYMENTS, rp,
} from "../src/data.js";
import { loadOrders, saveOrder } from "../src/lib.js";

const out = {};
// ---- A1: Rp per Diamond MLBB (termasuk bonus) ----
{
  const tab = GAMES.find((g) => g.id === "mobile-legends").tabs["Diamonds"];
  out.A1 = tab.map((it) => {
    const m = it.name.match(/(\d+) Diamonds/);
    const qty = Number(m[1]);
    const bonus = it.meta ? Number((it.meta.match(/\+ (\d+) bonus/) || [])[1] || 0) : 0;
    return { name: it.name, price: it.price, total: qty + bonus, perDM: +(it.price / (qty + bonus)).toFixed(2), badge: it.badge || null };
  });
}
// ---- A2: Rp per GB Telkomsel ----
{
  out.A2 = DATA_PACKAGES.telkomsel.map((p) => {
    const gb = Number((p.name.match(/(\d+)GB/) || p.meta.match(/(\d+)GB/) || [])[1] || NaN);
    return { name: p.name, price: p.price, gb, perGB: gb ? Math.round(p.price / gb) : null, meta: p.meta };
  });
}
// ---- A3: PLN admin flat ----
out.A3 = PLN_ITEMS.map((i) => ({ name: i.name, price: i.price, tokenValue: i.tokenValue, adminPct: +((2500 / i.tokenValue) * 100).toFixed(2) }));
// ---- A4: "Mulai Rp" per game ----
out.A4 = GAMES.map((g) => ({ name: g.name, from: g.from, cheapest: Math.min(...Object.values(g.tabs).flat().map((i) => i.price)) }));
// ---- A5: flash sale per Diamond ----
{
  const wdp = GAMES.find((g) => g.id === "mobile-legends").tabs["Weekly Pass"][0];
  out.A5 = { flashPrice: wdp.price, flashWas: wdp.was, flashDiscPct: +(((wdp.was - wdp.price) / wdp.was) * 100).toFixed(1),
    // 20 DM langsung + 20/hari*7 = 160 DM total
    perDMFlash: +(wdp.price / 160).toFixed(2),
    cheapestPerDM: Math.min(...out.A1.map((x) => x.perDM)),
    cheapestItem: out.A1.reduce((a, b) => (a.perDM < b.perDM ? a : b)).name };
}
// ---- A6: voucher markup per Rp1.000 ----
out.A6 = VOUCHERS.map((v) => {
  const first = v.items[0];
  return { name: v.name, firstItem: first.name, firstPrice: first.price,
    per1000: Math.round(first.price / (Number(first.name.replace(/[^\d]/g, "")) / 1000)) };
});
// ---- A7: pulsa 50.000 vs paket data seharga ----
out.A7 = { pulsa50k: OPERATORS[0].pulsa.find((i) => i.name === "Pulsa 50.000"),
  dataNear: DATA_PACKAGES.telkomsel.filter((p) => p.price >= 45000 && p.price <= 55000).map((p) => ({ name: p.name, price: p.price })) };
// ---- A8: e-wallet admin implisit ----
out.A8 = EMONEY_ITEMS.map((i) => {
  const nom = Number(i.name.replace(/[^\d]/g, ""));
  return { name: i.name, price: i.price, diff: i.price - nom, diffPct: +(((i.price - nom) / nom) * 100).toFixed(2) };
});
// ---- A9: termahal vs bonus per rupiah per tab ----
out.A9 = {};
for (const g of GAMES) {
  for (const [tab, items] of Object.entries(g.tabs)) {
    const withBonus = items.map((it) => {
      const qty = Number((it.name.match(/(\d+)/) || [])[1] || 0);
      const bonus = it.meta ? Number((it.meta.match(/\+ (\d+) bonus/) || [])[1] || 0) : 0;
      return { name: it.name, price: it.price, perUnit: qty + bonus ? +(it.price / (qty + bonus)).toFixed(2) : null, badge: it.badge || null };
    });
    out.A9[`${g.name} / ${tab}`] = withBonus;
  }
}
// ---- A10: pulsa 10.000 antar operator ----
out.A10 = OPERATORS.map((o) => ({ op: o.name, p10k: o.pulsa.find((i) => i.name === "Pulsa 10.000").price,
  cheapest: Math.min(...o.pulsa.map((i) => i.price)) }));
// ---- D simulasi ----
// D31: item harga 0 -> rp(0) dan "Mulai Rp0"
out.D31 = { rp0: rp(0), mulaiRp0: "Mulai " + rp(0) };
// D35: promo 0% dan 150%
{
  const base = 43500, pay = ALL_PAYMENTS.find((p) => p.id === "qris");
  out.D35 = {
    pct0: calcTotals(base, pay, { pct: 0, cap: 10000 }),
    pct150cap: calcTotals(base, pay, { pct: 1.5, cap: 100000 }),
    pct150nocap: calcTotals(base, pay, { pct: 1.5, cap: 1e12 }),
    pct100: calcTotals(base, pay, { pct: 1, cap: 1e12 }),
  };
}
// D36: fee undefined
{
  const weird = { id: "x", name: "X", fee: undefined };
  const weird2 = { id: "y", name: "Y" };
  out.D36 = { feeUndef: payFee(weird, 43500), feeMissing: payFee(weird2, 43500), totalsUndef: calcTotals(43500, weird, null) };
}
// D40: from vs termurah
out.D40 = out.A4.map((x) => ({ ...x, fromOk: x.from === x.cheapest }));
// ---- F: indeks ----
out.F51 = OPERATORS.map((o) => ({ op: o.name, nominal: o.pulsa.length, transfer: o.transfer ? o.transfer.length : 0 }));
out.F52 = Object.entries(DATA_PACKAGES).map(([k, v]) => ({ op: k, paket: v.length }));
out.F59 = {
  pulsaOps: OPERATORS.map((o) => o.id),
  dataOps: Object.keys(DATA_PACKAGES),
  onlyPulsa: OPERATORS.map((o) => o.id).filter((id) => !DATA_PACKAGES[id]),
  onlyData: Object.keys(DATA_PACKAGES).filter((id) => !OPERATORS.find((o) => o.id === id)),
};
// ---- I83: batas 30 (simulasi localStorage mock) ----
{
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
  };
  for (let i = 1; i <= 31; i++) {
    saveOrder({ ref: "RSD-TEST" + String(i).padStart(2, "0"), kind: "game", product: "Mobile Legends",
      item: "172 Diamonds", qty: 1, target: "12345678", base: 43500, fee: 0, disc: 0, total: 43500,
      method: "QRIS", time: Date.now(), status: i === 31 ? "Diproses" : "Selesai", email: "", wa: "" });
  }
  const kept = loadOrders();
  out.I83 = { keptCount: kept.length, firstRef: kept[0].ref, lastRef: kept[kept.length - 1].ref,
    oldestKept: kept[kept.length - 1].ref, droppedTest01: !kept.some((o) => o.ref === "RSD-TEST01"),
    diprosesKept: kept.some((o) => o.status === "Diproses") };
}
// ---- I84/85: pencarian nomor (logika CekPage: find exact, uppercase+trim) ----
{
  const orders = [{ ref: "RSD-ABC123XYZ9" }];
  const find = (q) => orders.find((o) => o.ref === q.trim().toUpperCase()) || null;
  out.I84 = { full: !!find("RSD-ABC123XYZ9"), sixMid: !!find("BC123X"), lower: !!find("rsd-abc123xyz9"), spaces: !!find("  RSD-ABC123XYZ9  ") };
}
// ---- J: pencarian (replika logika Home.jsx) ----
{
  const match = (txt, q) => !q || txt.toLowerCase().includes(q.trim().toLowerCase());
  const q = (query) => {
    const queryL = query.trim().toLowerCase();
    const games = GAMES.filter((g) => match(g.name + " " + g.publisher + " " + g.initials + " " + (g.aka || ""), queryL));
    const ewallets = EWALLETS.filter((w) => match(w.name, queryL));
    const vouchers = VOUCHERS.filter((v) => match(v.name + " voucher", queryL));
    const flash = FLASH_SALE.filter((f) => match(f.name + " " + f.sub, queryL));
    const showPulsa = match("pulsa reguler telkomsel by.u byu indosat xl axis tri smartfren", queryL);
    const showData = match("paket data kuota internet", queryL);
    const showPln = match("token pln listrik", queryL);
    const showTagihan = match("tagihan pascabayar pln pdam bpjs telkom indihome tv kabel multifinance pbb", queryL);
    return { games: games.map((g) => g.name), ewallets: ewallets.map((w) => w.name),
      vouchers: vouchers.map((v) => v.name), flash: flash.map((f) => f.name),
      showPulsa, showData, showPln, showTagihan };
  };
  out.J = {};
  for (const query of ["qris", "bca", "gopay", "0812", "pln", "data", "ewallet", "e-wallet", "saldo",
    "  Mlbb  ", "langsung ke akun", "Via UID", "hitungan detik", "Moonton", "Garena", "HoYoverse",
    "Rp1.650", "Rp 50.000", "pulsa", "MLBB", "mlbb", "DANA", "dana", "voucher", "steam", "token"]) {
    out.J[query] = q(query);
  }
}
// ---- B11/B12: istilah biaya di kode ----
{
  out.B = {
    payRowFeeText: "biaya RpX / tanpa biaya (+ ' · promo −RpX' bila diskon)",
    summaryFeeLabel: "Biaya pembayaran",
    pulsaFeeLabel: "biaya " + rp(Math.round(43500 * 0.07)) + " (7% dari Rp43.500)",
  };
}
// ---- H76: Terlaris per tab (posisi) ----
out.H76 = [];
for (const g of GAMES) {
  for (const [tab, items] of Object.entries(g.tabs)) {
    items.forEach((it, i) => { if (it.badge === "Terlaris") out.H76.push({ game: g.name, tab, item: it.name, pos: i + 1, of: items.length, price: it.price }); });
  }
}
console.log(JSON.stringify(out, null, 1));
