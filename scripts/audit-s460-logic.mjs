// Replika logika Node 1:1 untuk audit s460 — pencarian (Home.jsx),
// validasi (GamePage/PhonePages/PlnPage/CheckoutShell + maxLength input),
// harga calcTotals (data.js), kontras WCAG dari token index.css.
import { GAMES, EWALLETS, VOUCHERS, FLASH_SALE, OPERATORS, DATA_PACKAGES,
  PLN_ITEMS, EMONEY_ITEMS, calcTotals, ALL_PAYMENTS, PROMOS, RIOT_ID_RE } from "../src/data.js";
import { phoneOk } from "../src/lib.js";

const out = {};

// ---------- B. Pencarian (match persis Home.jsx) ----------
const match = (q, txt) => !q || txt.toLowerCase().includes(q);
const search = (qRaw) => {
  const query = qRaw.trim().toLowerCase();
  const m = (txt) => match(query, txt);
  const games = GAMES.filter((g) => m(g.name + " " + g.publisher + " " + g.initials + " " + (g.aka || ""))).map((g) => g.name);
  const ewallets = EWALLETS.filter((w) => m(w.name)).map((w) => w.name);
  const vouchers = VOUCHERS.filter((v) => m(v.name + " voucher")).map((v) => v.name);
  const flash = FLASH_SALE.filter((f) => m(f.name + " " + f.sub)).map((f) => f.name);
  const showPulsa = m("pulsa reguler telkomsel by.u byu indosat xl axis tri smartfren");
  const showData = m("paket data kuota internet");
  const showPln = m("token pln listrik");
  const showTagihan = m("tagihan pascabayar pln pdam bpjs telkom indihome tv kabel multifinance pbb");
  const nothing = !flash.length && !games.length && !showPulsa && !showData && !showPln && !showTagihan && !ewallets.length && !vouchers.length;
  return { games, ewallets, vouchers, flash, showPulsa, showData, showPln, showTagihan, nothing };
};
out.B = {};
for (const q of ["jenius","permata","bsi","kredivo","tokopedia","shopee","lazada","dana 20000","ovo 20000","telkomsel 20000","xl 20000","tri 20000","by.u 20000","steam 60000","psn 50000"]) {
  out.B[q] = search(q);
}

// ---------- C. Validasi ----------
const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;
const uidClean = (v) => v.replace(/[\s-]/g, "").replace(ZW, "");
const noLeadMinus = (v) => !/^\s*-/.test(v);
const notAllZero = (v) => !/^0+$/.test(v);
const uidOk = (v) => /^\d{6,}$/.test(uidClean(v)) && noLeadMinus(v) && notAllZero(uidClean(v));
const zoneOk = (v) => /^\d{4,6}$/.test(uidClean(v)) && noLeadMinus(v) && notAllZero(uidClean(v));
// maxLength input: UID 20, Zone 8, PLN 16 — paste lebih panjang terpotong diam-diam
const trunc = (v, n) => v.slice(0, n);
out.C = {
  uid40: { raw: "1234567890123456789012345678901234567890", typed: trunc("1234567890123456789012345678901234567890", 20), ok: uidOk(trunc("1234567890123456789012345678901234567890", 20)) },
  uid50: { raw: "12345678901234567890123456789012345678901234567890", typed: trunc("12345678901234567890123456789012345678901234567890", 20), ok: uidOk(trunc("12345678901234567890123456789012345678901234567890", 20)) },
  uid35: { raw: "12345678901234567890123456789012345", typed: trunc("12345678901234567890123456789012345", 20), ok: uidOk(trunc("12345678901234567890123456789012345", 20)) },
  zone25: { raw: "1234567890123456789012345", typed: trunc("1234567890123456789012345", 8), ok: zoneOk(trunc("1234567890123456789012345", 8)) },
  zone30: { raw: "123456789012345678901234567890", typed: trunc("123456789012345678901234567890", 8), ok: zoneOk(trunc("123456789012345678901234567890", 8)) },
  zone17: { raw: "12345678901234567", typed: trunc("12345678901234567", 8), ok: zoneOk(trunc("12345678901234567", 8)) },
  hp4: { clean: "0812", phoneOk: phoneOk("0812"), detected: "telkomsel" },
  hp3: { clean: "081", phoneOk: phoneOk("081") },
  pln30: { raw: "543210987654321098765432109876", typed: trunc("543210987654321098765432109876", 16), ok: /^\d{11,12}$/.test(trunc("543210987654321098765432109876", 16)) },
  pln22: { raw: "5432109876543210987654", typed: trunc("5432109876543210987654", 16), ok: /^\d{11,12}$/.test(trunc("5432109876543210987654", 16)) },
  wa30: { clean: "081234567890123456789012345678", phoneOk: phoneOk("081234567890123456789012345678"), warnOnly: true },
  wa25: { clean: "0812345678901234567890123", phoneOk: phoneOk("0812345678901234567890123"), warnOnly: true },
  riot15: { v: "NamaSatuDuaTiga#TAG12", ok: RIOT_ID_RE.test("NamaSatuDuaTiga#TAG12") },
  riotTag9: { v: "Nama#TAG123456", ok: RIOT_ID_RE.test("Nama#TAG123456") },
  orderDoubleDash: { v: "RSD--DEMO1234", note: "cleanRef tidak mengubah '--'; findOrder: bukan DEMO_REF, exact null, partial 0 -> null (tidak ditemukan)" },
};

// ---------- D. Harga ----------
const pay = (id) => ALL_PAYMENTS.find((p) => p.id === id);
out.D = {
  D41: calcTotals(42000, pay("qris"), PROMOS.ROSDI10),
  D42: calcTotals(299000, pay("qris"), PROMOS.GAMER5),
  D43: calcTotals(47500, pay("gopay"), PROMOS.ROSDI10),
  D44: calcTotals(144000, pay("bca"), PROMOS.GAMER5),
  D45: calcTotals(35000, pay("qris"), PROMOS.GAMER5),
  D46: calcTotals(202500, pay("dana"), PROMOS.GAMER5),
  D47: calcTotals(63000, pay("gopay"), PROMOS.ROSDI10),
  D48: calcTotals(51092, pay("qris"), PROMOS.ROSDI10),
  D49: calcTotals(119000, pay("gopay"), PROMOS.ROSDI10),
  D50: calcTotals(75000, pay("bca"), PROMOS.GAMER5),
  D51: calcTotals(175500, pay("qris"), PROMOS.ROSDI10),
  D52: calcTotals(52500, pay("qris"), PROMOS.GAMER5),
};
// harga dasar verifikasi
out.Dbase = {
  weeklyPlus: 42000, roblox1700: 299000, ff355: 47500, pubg660: 144000,
  byu10gb: DATA_PACKAGES.byu.find((p) => p.name === "Kuota by.U 10GB").price,
  pln200k: PLN_ITEMS.find((p) => p.tokenValue === 200000).price,
  steam60k: 63000, dana50k: EMONEY_ITEMS.find((p) => p.name === "Saldo 50.000").price,
  valorant1000: 119000, codm400: 75000, mlbb706: 175500,
  pln50k: PLN_ITEMS.find((p) => p.tokenValue === 50000).price,
};

// ---------- F. Kontras WCAG dari token ----------
const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};
out.F = {
  // F65 Masuk (.btn): Light putih/#2563eb; Dark putih/#2563eb (--blue-strong)
  masukLight: ratio("#ffffff", "#2563eb"),
  masukDark: ratio("#ffffff", "#2563eb"),
  // F66 hero p --hero-sub #c7d7fb di --blue-deep #1e3a8a (kedua tema sama)
  heroSub: ratio("#c7d7fb", "#1e3a8a"),
  // F67 trust span --sub di --surface
  trustLight: ratio("#5b6b82", "#ffffff"),
  trustDark: ratio("#9db0c9", "#131f36"),
  // F68 footer h2 --ink di --surface
  footerH2Light: ratio("#0f172a", "#ffffff"),
  footerH2Dark: ratio("#f1f5f9", "#131f36"),
  // F69 mobile-bar Beli = .btn (sama dgn F65)
  beliBarLight: ratio("#ffffff", "#2563eb"),
  beliBarDark: ratio("#ffffff", "#2563eb"),
  // F70 tab aktif .tab.on: putih di --blue-strong Light #1d4ed8, Dark #2563eb
  tabOnLight: ratio("#ffffff", "#1d4ed8"),
  tabOnDark: ratio("#ffffff", "#2563eb"),
};

console.log(JSON.stringify(out, null, 1));
