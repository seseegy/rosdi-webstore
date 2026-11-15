// Replika logika Node 1:1 untuk audit s461 — pencarian (Home.jsx),
// validasi (GamePage/PhonePages/PlnPage/CheckoutShell/InfoPages),
// harga calcTotals (data.js), kontras WCAG dari token index.css.
import { GAMES, EWALLETS, VOUCHERS, FLASH_SALE, OPERATORS, DATA_PACKAGES,
  PLN_ITEMS, EMONEY_ITEMS, calcTotals, ALL_PAYMENTS, PROMOS, RIOT_ID_RE } from "../src/data.js";
import { phoneOk } from "../src/lib.js";

const out = {};

// ---------- B. Pencarian (match persis Home.jsx, cat="semua") ----------
const search = (qRaw) => {
  const query = qRaw.trim().toLowerCase();
  const m = (txt) => !query || txt.toLowerCase().includes(query);
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
for (const q of ["ff 500","mlbb 500","genshin 100","pulsa 20000","voucher 50000","saldo 50000","diamond 500","top up 50000","bayar tagihan","token 20000","data 10gb","kuota 10gb","game 500","pulsa 50000","saldo 100000"]) {
  out.B[q] = search(q);
}

// ---------- C. Validasi (replika persis komponen) ----------
const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;
const uidClean = (v) => v.replace(/[\s-]/g, "").replace(ZW, "");
const noLeadMinus = (v) => !/^\s*-/.test(v);
const notAllZero = (v) => !/^0+$/.test(v);
const uidOk = (v) => /^\d{6,}$/.test(uidClean(v)) && noLeadMinus(v) && notAllZero(uidClean(v));
const zoneOk = (v) => /^\d{4,6}$/.test(uidClean(v)) && noLeadMinus(v) && notAllZero(uidClean(v));
const trunc = (v, n) => v.slice(0, n);
// WA Detail Kontak (CheckoutShell): normalisasi +62 -> 0, warning saja
const waClean = (v) => v.replace(/[\s-]/g, "").replace(ZW, "").replace(/^\+?62/, "0");
const waWarn = (v) => v.trim() !== "" && !phoneOk(waClean(v));
// Email (CheckoutShell): regex + batas panjang RFC 5321
const emailRe = /^(?!\.)(?!.*\.\.)(?!.*\.@)(?!.*@\.)[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const emailWarn = (v) => { const t = v.replace(ZW, "").trim(); return v.trim() !== "" && (!emailRe.test(t) || t.length > 254 || t.split("@")[0].length > 64); };
// Cek Transaksi: cleanRef + findOrder (DEMO_REF + exact + partial unik)
const cleanRef = (v) => v.replace(ZW, "").replace(/[\s]/g, "").toUpperCase();
const findOrder = (r, orders) => {
  if (!r) return undefined;
  if (r === "RSD-DEMO1234") return "DEMO";
  const exact = orders.find((o) => o.ref === r);
  if (exact) return exact;
  const partial = orders.filter((o) => o.ref.includes(r));
  return partial.length === 1 ? partial[0] : null;
};
const plnOk = (v) => /^\d{11,12}$/.test(v.replace(/[\s.-]/g, "").replace(ZW, "")) && !/^\s*-/.test(v) && !/^0+$/.test(v.replace(/[\s.-]/g, "").replace(ZW, ""));
out.C = {
  waPlus62: { v: "+62", clean: waClean("+62"), phoneOk: phoneOk(waClean("+62")), warn: waWarn("+62") },
  zone8nol: { v: "00000000", typed: trunc("00000000", 8), ok: zoneOk(trunc("00000000", 8)) },
  uid22: { raw: "1234567890123456789012", len: 22, typed: trunc("1234567890123456789012", 20), typedLen: 20, ok: uidOk(trunc("1234567890123456789012", 20)) },
  uid24: { raw: "123456789012345678901234", len: 24, typed: trunc("123456789012345678901234", 20), typedLen: 20, ok: uidOk(trunc("123456789012345678901234", 20)) },
  orderSpasi: { v: "RSD DEMO1234", clean: cleanRef("RSD DEMO1234"), hasil: findOrder(cleanRef("RSD DEMO1234"), []) },
  wa2digit: { v: "08", clean: waClean("08"), phoneOk: phoneOk(waClean("08")), warn: waWarn("08") },
  uid60: { raw: "1234567890".repeat(6), len: 60, typed: trunc("1234567890".repeat(6), 20), typedLen: 20, ok: uidOk(trunc("1234567890".repeat(6), 20)) },
  zone18: { raw: "123456789012345678", len: 18, typed: trunc("123456789012345678", 8), typedLen: 8, ok: zoneOk(trunc("123456789012345678", 8)) },
  zone19: { raw: "1234567890123456789", len: 19, typed: trunc("1234567890123456789", 8), typedLen: 8, ok: zoneOk(trunc("1234567890123456789", 8)) },
  emailLocal64: { v: "a".repeat(64) + "@mail.com", localLen: 64, totalLen: 64 + 9, warn: emailWarn("a".repeat(64) + "@mail.com") },
  hp26: { v: "08123456789012345678901234", len: 26, phoneOk: phoneOk("08123456789012345678901234") },
  hp30: { v: "081234567890123456789012345678", len: 30, phoneOk: phoneOk("081234567890123456789012345678") },
  pln23: { raw: "54321098765432109876543", len: 23, typed: trunc("54321098765432109876543", 16), typedLen: 16, ok: plnOk(trunc("54321098765432109876543", 16)) },
  wa22: { v: "0812345678901234567890", len: 22, clean: waClean("0812345678901234567890"), phoneOk: phoneOk(waClean("0812345678901234567890")), warn: waWarn("0812345678901234567890") },
  emailCoUk: { v: "nama@mail.co.uk", warn: emailWarn("nama@mail.co.uk") },
};

// ---------- D. Harga (calcTotals asli; harga dasar diverifikasi dari data.js) ----------
const pay = (id) => ALL_PAYMENTS.find((p) => p.id === id);
const findGameItem = (gameId, itemName) => {
  const g = GAMES.find((x) => x.id === gameId);
  for (const tab of Object.values(g.tabs)) { const it = tab.find((i) => i.name === itemName); if (it) return it.price; }
  return null;
};
out.Dbase = {
  pubg1800: findGameItem("pubg-mobile", "1800 UC"),
  hok400: findGameItem("honor-of-kings", "400 Token"),
  ff50: findGameItem("free-fire", "50 Diamonds"),
  hok2400: findGameItem("honor-of-kings", "2400 Token"),
  val2050: findGameItem("valorant", "2050 Points"),
  wr1000: findGameItem("wild-rift", "1000 Wild Cores"),
  df300: findGameItem("delta-force", "300 Delta Coins"),
  codm2000: findGameItem("cod-mobile", "2000 CP"),
  mlbb1050: findGameItem("mobile-legends", "1050 Diamonds"),
  aov460: findGameItem("arena-of-valor", "460 Voucher"),
  psn200k: VOUCHERS.find((v) => v.id === "playstation").items.find((i) => i.name === "PSN IDR 200.000").price,
  steam90k: VOUCHERS.find((v) => v.id === "steam-wallet").items.find((i) => i.name === "Steam Wallet 90.000").price,
};
out.D = {
  D41: calcTotals(out.Dbase.pubg1800, pay("qris"), PROMOS.ROSDI10),
  D42: calcTotals(out.Dbase.hok400, pay("qris"), PROMOS.GAMER5),
  D43: calcTotals(out.Dbase.ff50, pay("gopay"), PROMOS.ROSDI10),
  D44: calcTotals(out.Dbase.hok2400, pay("qris"), PROMOS.ROSDI10),
  D45: calcTotals(out.Dbase.val2050, pay("gopay"), PROMOS.GAMER5),
  D46: calcTotals(out.Dbase.wr1000, pay("qris"), PROMOS.ROSDI10),
  D47: calcTotals(out.Dbase.df300, pay("alfamart"), PROMOS.GAMER5),
  D48: calcTotals(out.Dbase.codm2000, pay("bca"), PROMOS.ROSDI10),
  D49: calcTotals(out.Dbase.mlbb1050, pay("qris"), PROMOS.ROSDI10),
  D50: calcTotals(out.Dbase.aov460, pay("dana"), PROMOS.GAMER5),
  D51: calcTotals(out.Dbase.psn200k, pay("dana"), PROMOS.GAMER5),
  D52: calcTotals(out.Dbase.steam90k, pay("dana"), PROMOS.ROSDI10),
};

// ---------- F. Kontras WCAG dari token index.css ----------
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
  // F67 hero .btn: Light teks --blue-deep #1e3a8a di bg putih; Dark teks --blue-deep #172f5e di bg putih
  mulaiTopUpLight: ratio("#1e3a8a", "#ffffff"),
  mulaiTopUpDark: ratio("#172f5e", "#ffffff"),
  // F68 Belanja Lagi (.btn): putih di --blue-strong; Light #1d4ed8, Dark #2563eb
  belanjaLagiLight: ratio("#ffffff", "#1d4ed8"),
  belanjaLagiDark: ratio("#ffffff", "#2563eb"),
  // F69 .sec-head .more (--blue-text) di --bg
  hargaMulaiLight: ratio("#2563eb", "#f6f8fb"),
  hargaMulaiDark: ratio("#60a5fa", "#0b1220"),
  // F70-73 .p-from (--blue-text) di --surface (kartu)
  pFromLight: ratio("#2563eb", "#ffffff"),
  pFromDark: ratio("#60a5fa", "#131f36"),
};

console.log(JSON.stringify(out, null, 1));
