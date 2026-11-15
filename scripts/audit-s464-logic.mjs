// Audit logika s464 (read-only): B pencarian, C validasi, D harga, F kontras, H deep link.
// Replikasi persis match() Home.jsx, regex GamePage/PlnPage/PhonePages/CheckoutShell, calcTotals data.js.
import { GAMES, EWALLETS, VOUCHERS, FLASH_SALE, DATA_PACKAGES, OPERATORS, PLN_ITEMS, BILLS, billItem, calcTotals, PROMOS, payFee, ALL_PAYMENTS } from "../src/data.js";
import { phoneOk } from "../src/lib.js";

const out = { B: {}, C: {}, D: {}, F: {}, H: {} };

// ---------- B. Pencarian (match() Home.jsx persis) ----------
const search = (q) => {
  const query = q.trim().toLowerCase();
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
  return { q, games, ewallets, vouchers, flash, showPulsa, showData, showPln, showTagihan, empty: nothing };
};
for (const q of ["data 20gb","codm 5000","genshin 5000","saldo 10000","saldo 200000","shopeepay 20000","voucher 5000","voucher 300000","valorant 1000","codm 1000","genshin 1000","pubg 1000","aov 1000","axis 50000"]) out.B[q] = search(q);

// ---------- C. Validasi (replikasi persis tiap halaman) ----------
const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;
const noLeadMinus = (v) => !/^\s*-/.test(v);
const notAllZero = (v) => !/^0+$/.test(v);
const uidCheck = (raw) => {
  const typed = raw.slice(0, 20); // GamePage.jsx:53 maxLength=20
  const clean = typed.replace(/[\s-]/g, "").replace(ZW, "");
  const ok = /^\d{6,}$/.test(clean) && noLeadMinus(typed) && notAllZero(clean);
  return { rawLen: raw.length, typedLen: typed.length, cleanLen: clean.length, diterima: ok, terpotong: raw.length > 20 };
};
const zoneCheck = (raw) => {
  const typed = raw.slice(0, 8); // GamePage.jsx:56 maxLength=8
  const clean = typed.replace(/[\s-]/g, "").replace(ZW, "");
  const ok = /^\d{4,6}$/.test(clean) && noLeadMinus(typed) && notAllZero(clean);
  return { rawLen: raw.length, typedLen: typed.length, cleanLen: clean.length, diterima: ok, terpotong: raw.length > 8 };
};
const plnCheck = (raw) => {
  const typed = raw.slice(0, 16); // PlnPage.jsx:32 maxLength=16
  const clean = typed.replace(/[\s.-]/g, "").replace(ZW, "");
  const ok = /^\d{11,12}$/.test(clean) && !/^\s*-/.test(typed) && !/^0+$/.test(clean);
  return { rawLen: raw.length, typedLen: typed.length, cleanLen: clean.length, diterima: ok, terpotong: raw.length > 16 };
};
const waCheck = (raw) => {
  const clean = raw.replace(/[\s-]/g, "").replace(ZW, "").replace(/^\+?62/, "0"); // CheckoutShell.jsx:50
  return { rawLen: raw.length, cleanLen: clean.length, phoneOk: phoneOk(clean), peringatan: raw.trim() !== "" && !phoneOk(clean), blokirBeli: false };
};
const hpCheck = (raw) => {
  const clean = raw.replace(/[\s().-]/g, "").replace(ZW, "").replace(/^\+?62/, "0"); // PhonePages.jsx:13
  const ok = phoneOk(clean);
  return { rawLen: raw.length, cleanLen: clean.length, phoneOk: ok, blokirBeli: !ok };
};
out.C.uid33 = uidCheck("123456789012345678901234567890123");
out.C.uid34 = uidCheck("1234567890123456789012345678901234");
out.C.uid36 = uidCheck("123456789012345678901234567890123456");
out.C.zone27 = zoneCheck("123456789012345678901234567");
out.C.zone28 = zoneCheck("1234567890123456789012345678");
out.C.zone29 = zoneCheck("12345678901234567890123456789");
out.C.zone31 = zoneCheck("1234567890123456789012345678901");
out.C.pln32 = plnCheck("54321098765432109876543210987654");
out.C.pln33 = plnCheck("543210987654321098765432109876543");
out.C.pln34 = plnCheck("5432109876543210987654321098765432");
out.C.pln20 = plnCheck("54321098765432109876");
out.C.wa29 = waCheck("08123456789012345678901234567");
out.C.wa31 = waCheck("0812345678901234567890123456789");
out.C.wa32 = waCheck("08123456789012345678901234567890");
out.C.hp32 = hpCheck("08123456789012345678901234567890");
out.C.hp33 = hpCheck("081234567890123456789012345678901");
out.C.hp34 = hpCheck("0812345678901234567890123456789012");
out.C.hp35 = hpCheck("08123456789012345678901234567890123");
out.C.sanity = { uid8: uidCheck("12345678"), zone4: zoneCheck("1234"), pln12: plnCheck("543210987654"), wa13: waCheck("0812345678901"), hp13: hpCheck("0812345678901") };

// ---------- D. Harga (dasar dibaca dari data.js, total via calcTotals) ----------
const gameItem = (id, tab, name) => GAMES.find((g) => g.id === id).tabs[tab].find((i) => i.name === name);
const pay = (id) => ALL_PAYMENTS.find((p) => p.id === id);
const price = (base, promoId, payId, expected) => {
  const t = calcTotals(base, pay(payId), PROMOS[promoId]);
  return { base, promo: promoId, pay: payId, fee: t.fee, disc: t.disc, total: t.total, expected, cocok: t.total === expected };
};
out.D.dasar = {
  mlbb2xWeekly: gameItem("mobile-legends", "Weekly Pass", "2x Weekly Diamond Pass")?.price,
  mlbbTwilight: gameItem("mobile-legends", "Weekly Pass", "Twilight Pass")?.price,
  byu10gb: DATA_PACKAGES.byu.find((i) => i.name === "Kuota by.U 10GB")?.price,
  plnPascabayar: billItem(BILLS.find((b) => b.id === "pln-pascabayar"))?.price,
  ffMemberBulanan: gameItem("free-fire", "Membership", "Membership Bulanan")?.price,
  hokWeekly: gameItem("honor-of-kings", "Weekly Card", "Weekly Card")?.price,
  gp20000: VOUCHERS.find((v) => v.id === "google-play").items.find((i) => i.name === "Saldo 20.000")?.price,
  pln500k: PLN_ITEMS.find((i) => i.tokenValue === 500000)?.price,
  mlbb344: gameItem("mobile-legends", "Diamonds", "344 Diamonds")?.price,
  mlbb28: gameItem("mobile-legends", "Diamonds", "28 Diamonds")?.price,
  mlbb44: gameItem("mobile-legends", "Diamonds", "44 Diamonds")?.price,
  genshinWelkin: gameItem("genshin-impact", "Blessing", "Blessing of the Welkin Moon")?.price,
};
out.D.d43 = price(55500, "ROSDI10", "qris", 49950);
out.D.d44 = price(128000, "GAMER5", "gopay", 123250);
out.D.d45 = price(35000, "GAMER5", "dana", 33500);
out.D.d46 = price(189900, "GAMER5", "qris", 184900);
out.D.d47 = price(89000, "ROSDI10", "qris", 80100);
out.D.d48 = price(14500, "GAMER5", "dana", 14025);
out.D.d49 = price(22000, "ROSDI10", "gopay", 20050);
out.D.d50 = price(502500, "GAMER5", "qris", 497500);
out.D.d51 = price(86500, "ROSDI10", "dana", 78100);
out.D.d52 = price(8950, "GAMER5", "qris", 8503);
out.D.d53 = price(13900, "ROSDI10", "bca", 15010);
out.D.d54 = price(62000, "GAMER5", "gopay", 59150);

// ---------- F. Kontras (WCAG) ----------
const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100; };
out.F = {
  // ide 69: h2 "Transaksi terakhir di perangkat ini" — .step-head h2, warna --ink di --surface
  h2_riwayat_light: { fg: "#0f172a", bg: "#ffffff", ratio: ratio("#0f172a", "#ffffff") },
  h2_riwayat_dark: { fg: "#f1f5f9", bg: "#131f36", ratio: ratio("#f1f5f9", "#131f36") },
  // ide 70: tagline kartu game — .p-sub, warna --sub di --surface
  psub_tagline_light: { fg: "#5b6b82", bg: "#ffffff", ratio: ratio("#5b6b82", "#ffffff") },
  psub_tagline_dark: { fg: "#9db0c9", bg: "#131f36", ratio: ratio("#9db0c9", "#131f36") },
};

// ---------- H. Deep link ----------
// App.jsx: hash-only routing; parts = hash.split("/"); query "?...": 
// - "#/?tab=voucher" -> parts[0] = "?tab=voucher" -> tidak cocok rute mana pun -> Home
// - "#/pulsa?operator=smartfren" -> parts[0] = "pulsa?operator=smartfren" -> Home
// - "#/game/mobile-legends?metode=bca" / "?qty=4" -> parts[1] tercemar -> GAMES.find gagal -> Home
// - "#/?game=mlbb" -> parts[0] = "?game=mlbb" -> Home
// location.search / URLSearchParams = 0 hit di src/ (grep).
out.H = {
  catatan: "App.jsx: hash-only routing; location.search tidak pernah dibaca (grep = 0 hit di src/). Semua query di bawah jatuh ke Beranda (akar s460-6).",
  tab_voucher: "-> Beranda", tab_flash: "-> Beranda",
  operator_smartfren: "-> Beranda", operator_axis: "-> Beranda",
  metode_bca: "-> Beranda", metode_ovo: "-> Beranda",
  qty_4: "-> Beranda (segmen game tercemar)", game_mlbb: "-> Beranda",
};

console.log(JSON.stringify(out, null, 1));
