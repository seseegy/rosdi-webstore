// Audit logika s458 (Node 1:1 dari src/data.js + src/lib.js + logika Home.jsx):
// B11-25 pencarian, C26-40 validasi, D41-52 calcTotals, F65-70 kontras WCAG.
import {
  GAMES, OPERATORS, EWALLETS, VOUCHERS, FLASH_SALE, DATA_PACKAGES,
  PLN_ITEMS, EMONEY_ITEMS, PROMOS, calcTotals, RIOT_ID_RE,
} from "../src/data.js";
import { phoneOk } from "../src/lib.js";

const out = {};
const rec = (id, v) => { out[id] = v; console.log(id, JSON.stringify(v)); };

// ---------- B. Pencarian: replika persis Home.jsx ----------
const homeSearch = (qRaw) => {
  const query = qRaw.trim().toLowerCase();
  const match = (txt) => !query || txt.toLowerCase().includes(query);
  const games = GAMES.filter((g) => match(g.name + " " + g.publisher + " " + g.initials + " " + (g.aka || "")));
  const ewallets = EWALLETS.filter((w) => match(w.name));
  const vouchers = VOUCHERS.filter((v) => match(v.name + " voucher"));
  const flash = FLASH_SALE.filter((f) => match(f.name + " " + f.sub));
  const showPulsa = match("pulsa reguler telkomsel by.u byu indosat xl axis tri smartfren");
  const showData = match("paket data kuota internet");
  const showPln = match("token pln listrik");
  const showTagihan = match("tagihan pascabayar pln pdam bpjs telkom indihome tv kabel multifinance pbb");
  const showEmoney = ewallets.length > 0;
  const showVoucher = vouchers.length > 0;
  const nothing = !flash.length && !games.length && !showPulsa && !showData && !showPln && !showTagihan && !showEmoney && !showVoucher;
  return {
    games: games.map((g) => g.name), flash: flash.map((f) => f.name),
    ewallets: ewallets.map((w) => w.name), vouchers: vouchers.map((v) => v.name),
    showPulsa, showData, showPln, showTagihan, empty: nothing,
  };
};
for (const [id, q] of [
  ["B11", "telkomsel 5000"], ["B12", "xl 10000"], ["B13", "tri 5000"], ["B14", "by.u 10000"],
  ["B15", "pln 50000"], ["B16", "shopeepay 50000"], ["B17", "steam 50000"], ["B18", "psn 100000"],
  ["B19", "mlbb 1000"], ["B20", "genshin 60000"], ["B21", "2gb"], ["B22", "100gb"],
  ["B23", "1gb"], ["B24", "bulanan"], ["B25", "netflix"],
]) rec(id, { q, ...homeSearch(q) });

// ---------- C. Validasi: replika GamePage/PhonePages/PlnPage/CheckoutShell/InfoPages ----------
const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;
const noLeadMinus = (v) => !/^\s*-/.test(v);
const notAllZero = (v) => !/^0+$/.test(v);
const uidOk = (v) => { const c = v.replace(/[\s-]/g, "").replace(ZW, ""); return /^\d{6,}$/.test(c) && noLeadMinus(v) && notAllZero(c); };
const zoneOk = (v) => { const c = v.replace(/[\s-]/g, "").replace(ZW, ""); return /^\d{4,6}$/.test(c) && noLeadMinus(v) && notAllZero(c); };
const hpClean = (v) => v.replace(/[\s().-]/g, "").replace(ZW, "").replace(/^\+?62/, "0");
const hpOk = (v) => phoneOk(hpClean(v));
const plnOk = (v) => { const c = v.replace(/[\s.-]/g, "").replace(ZW, ""); return /^\d{11,12}$/.test(c) && !/^\s*-/.test(v) && !/^0+$/.test(c); };
const waClean = (v) => v.replace(/[\s-]/g, "").replace(ZW, "").replace(/^\+?62/, "0");
const waWarn = (v) => v.trim() !== "" && !phoneOk(waClean(v));
const riotOk = (v) => RIOT_ID_RE.test(v.replace(/[\s]/g, "").replace(ZW, ""));
const emailWarn = (v) => {
  const t = v.replace(ZW, "").trim();
  return v.trim() !== "" && (!/^(?!\.)(?!.*\.\.)(?!.*\.@)(?!.*@\.)[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(t) || t.length > 254 || t.split("@")[0].length > 64);
};
const cleanRef = (v) => v.replace(ZW, "").replace(/[\s]/g, "").toUpperCase();
rec("C26", { input: "12345678901234567 (17 digit)", uidOk: uidOk("12345678901234567") });
rec("C27", { input: "1234567890123456789 (19 digit)", uidOk: uidOk("1234567890123456789") });
rec("C28", { input: "123456789012345 (15 digit)", zoneOk: zoneOk("123456789012345") });
rec("C29", { input: "08 + 22 digit = 24 digit", hpOk: hpOk("08" + "1".repeat(22)), cleanLen: hpClean("08" + "1".repeat(22)).length });
rec("C30", { input: "5432109 (7 digit)", plnOk: plnOk("5432109") });
rec("C31", { input: "08 + 16 digit = 18 digit", waWarn: waWarn("08" + "1".repeat(16)), note: "WA hanya peringatan, tidak memblokir Beli" });
rec("C32", { input: "NamaSatuX#TAG12 (nama 9, tag 5)", riotOk: riotOk("NamaSatuX#TAG12") });
rec("C33", { input: "Nama#TAG12345 (tag 8)", riotOk: riotOk("Nama#TAG12345") });
rec("C34", { input: "08 + 23 digit = 25 digit", hpOk: hpOk("08" + "1".repeat(23)) });
rec("C35", { input: "08 + 17 digit = 19 digit", waWarn: waWarn("08" + "1".repeat(17)) });
rec("C36", { input: "a@mail.com (local 1)", emailWarn: emailWarn("a@mail.com") });
rec("C37", { input: "local 65 karakter", localLen: 65, emailWarn: emailWarn("a".repeat(65) + "@mail.com") });
rec("C38", { input: "RSD/DEMO1234", clean: cleanRef("RSD/DEMO1234"), findInEmptyOrders: "null (tidak ditemukan)", msg: "Nomor transaksi tidak ditemukan di perangkat ini." });
rec("C39", { input: "DISKON10", known: !!PROMOS["DISKON10"], msg: "Kode DISKON10 tidak dikenal. Coba ROSDI10 atau GAMER5." });
rec("C40", { input: "NamaSatuDu#TAG12 (nama 10, tag 5)", riotOk: riotOk("NamaSatuDu#TAG12") });

// ---------- D. Harga: calcTotals asli + harga dasar dari data.js ----------
import { ALL_PAYMENTS } from "../src/data.js";
const findGameItem = (gameId, name) => {
  const g = GAMES.find((x) => x.id === gameId);
  for (const t of Object.values(g.tabs)) { const it = t.find((i) => i.name === name); if (it) return it; }
  return null;
};
const price = (label, got, want) => ({ label, got, want, sama: got === want });
rec("D-base", [
  price("PUBG 60 UC", findGameItem("pubg-mobile", "60 UC").price, 14500),
  price("FF 140 Diamonds", findGameItem("free-fire", "140 Diamonds").price, 18900),
  price("Steam Wallet 12.000", VOUCHERS.find((v) => v.id === "steam-wallet").items.find((i) => i.name === "Steam Wallet 12.000").price, 12600),
  price("PLN 20.000", PLN_ITEMS.find((i) => i.name === "Token 20.000").price, 22500),
  price("Tsel Pulsa 5.000", OPERATORS.find((o) => o.id === "telkomsel").pulsa.find((i) => i.name === "Pulsa 5.000").price, 6500),
  price("DANA Saldo 10.000", EMONEY_ITEMS.find((i) => i.name === "Saldo 10.000").price, 10292),
  price("Google Play Saldo 5.000", VOUCHERS.find((v) => v.id === "google-play").items.find((i) => i.name === "Saldo 5.000").price, 5500),
  price("FF 70 Diamonds (flash)", findGameItem("free-fire", "70 Diamonds").price, 9450),
  price("MLBB 2195 Diamonds", findGameItem("mobile-legends", "2195 Diamonds").price, 548000),
  price("Genshin 3880 GC", findGameItem("genshin-impact", "3880 Genesis Crystal").price, 619000),
  price("PLN 1.000.000", PLN_ITEMS.find((i) => i.name === "Token 1.000.000").price, 1002500),
  price("by.U 2GB", DATA_PACKAGES.byu.find((i) => i.name === "Kuota by.U 2GB").price, 9000),
]);
const check = (id, base, payId, promoCode, want) => {
  const pay = ALL_PAYMENTS.find((p) => p.id === payId);
  const t = calcTotals(base, pay, promoCode ? PROMOS[promoCode] : null);
  rec(id, { base, pay: pay.name, fee: t.fee, disc: t.disc, total: t.total, want, sama: t.total === want });
};
check("D41", 14500, "bca", "ROSDI10", 15550);
check("D42", 18900, "dana", "ROSDI10", 17260);
check("D43", 12600, "shopeepay", "GAMER5", 12220);
check("D44", 22500, "indomaret", "GAMER5", 23875);
check("D45", 6500, "qris", "ROSDI10", 5850);
check("D46", 10292, "bca", "ROSDI10", 11763);
check("D47", 5500, "gopay", "GAMER5", 5475);
check("D48", 9450, "dana", "GAMER5", 9228);
check("D49", 548000, "bca", "ROSDI10", 540500);
check("D50", 619000, "qris", "ROSDI10", 609000);
check("D51", 1002500, "bca", "ROSDI10", 995000);
check("D52", 9000, "qris", "ROSDI10", 8100);

// ---------- F. Kontras WCAG ----------
const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
rec("F-contrast", {
  // 65: .note (--sub) di atas --surface; 66: .n-meta (--sub) di atas --field; 67: .note (--sub) di atas --surface
  note_sub_light: ratio("#5b6b82", "#ffffff"), note_sub_dark: ratio("#9db0c9", "#131f36"),
  nmeta_sub_light: ratio("#5b6b82", "#f8fafc"), nmeta_sub_dark: ratio("#9db0c9", "#0e1930"),
  // 68/69/70: teks putih .btn di atas --blue
  btn_putih_light: ratio("#ffffff", "#2563eb"), btn_putih_dark: ratio("#ffffff", "#3b82f6"),
  // pembanding: --green note.good, --red note.bad
  note_good_light: ratio("#047857", "#ffffff"), note_good_dark: ratio("#34d399", "#131f36"),
  note_bad_light: ratio("#b91c1c", "#ffffff"), note_bad_dark: ratio("#f87171", "#131f36"),
  AA: 4.5,
});

// ---------- I. Mikrokopi: grep sudah dilakukan di shell; catat hasil hitungan ----------
rec("I-grep", {
  Login_UI: 0, PromoKilat_src: 0, IDPengguna_src: 0, BiayaLayanan_src: 0,
  SaldoMasukDANA_src: 0, URLSearchParams_src: 0,
});
console.log("SELESAI-LOGIC");
