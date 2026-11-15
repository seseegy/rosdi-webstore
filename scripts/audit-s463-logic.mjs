// Audit logika s463 (read-only): B pencarian, C validasi, D harga, F kontras, H deep link.
// Replikasi persis match() Home.jsx, regex GamePage/PlnPage/PhonePages/CheckoutShell, calcTotals data.js.
import { GAMES, EWALLETS, VOUCHERS, FLASH_SALE, OPERATORS, PLN_ITEMS, calcTotals, PROMOS, payFee, ALL_PAYMENTS, DATA_PACKAGES } from "../src/data.js";
import { phoneOk } from "../src/lib.js";

const out = { B: {}, C: {}, D: {}, F: {}, H: {} };

// ---------- B. Pencarian (match() Home.jsx) ----------
const match = (txt, q) => !q || txt.toLowerCase().includes(q.toLowerCase());
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
for (const q of ["gopay 10000","ovo 10000","shopeepay 10000","axis 20000","smartfren 20000","steam 10000","psn 10000","dana 200000","pulsa 200000","pln 200000","saldo 500000","ff 5000","mlbb 5000","pubg 5000","voucher 20000","mlbb","steam","dana 10000"]) out.B[q] = search(q);

// ---------- C. Validasi ----------
const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;
const noLeadMinus = (v) => !/^\s*-/.test(v);
const notAllZero = (v) => !/^0+$/.test(v);
// UID: input maxLength=20 (GamePage.jsx:53); regex /^\d{6,}$/
const uidCheck = (raw) => {
  const typed = raw.slice(0, 20); // maxLength memotong tempelan
  const clean = typed.replace(/[\s-]/g, "").replace(ZW, "");
  const ok = /^\d{6,}$/.test(clean) && noLeadMinus(typed) && notAllZero(clean);
  return { rawLen: raw.length, typedLen: typed.length, cleanLen: clean.length, diterima: ok };
};
// Zone: maxLength=8; regex /^\d{4,6}$/
const zoneCheck = (raw) => {
  const typed = raw.slice(0, 8);
  const clean = typed.replace(/[\s-]/g, "").replace(ZW, "");
  const ok = /^\d{4,6}$/.test(clean) && noLeadMinus(typed) && notAllZero(clean);
  return { rawLen: raw.length, typedLen: typed.length, cleanLen: clean.length, diterima: ok };
};
// PLN: maxLength=16; regex /^\d{11,12}$/ (PlnPage.jsx:17)
const plnCheck = (raw) => {
  const typed = raw.slice(0, 16);
  const clean = typed.replace(/[\s.-]/g, "").replace(ZW, "");
  const ok = /^\d{11,12}$/.test(clean) && !/^\s*-/.test(typed) && !/^0+$/.test(clean);
  return { rawLen: raw.length, typedLen: typed.length, cleanLen: clean.length, diterima: ok };
};
// WA: tanpa maxLength; waClean di CheckoutShell (+62 -> 0); phoneOk /^08\d{8,11}$/
const waCheck = (raw) => {
  const clean = raw.replace(/[\s-]/g, "").replace(ZW, "").replace(/^\+?62/, "0");
  return { rawLen: raw.length, clean, phoneOk: phoneOk(clean), peringatan: raw.trim() !== "" && !phoneOk(clean), blokirBeli: false };
};
// HP: tanpa maxLength; PhonePages clean sama; phoneOk; valid memblokir Beli
const hpCheck = (raw) => {
  const clean = raw.replace(/[\s-]/g, "").replace(ZW, "");
  const ok = phoneOk(clean);
  return { rawLen: raw.length, cleanLen: clean.length, phoneOk: ok, blokirBeli: !ok };
};
out.C.uid28 = uidCheck("1234567890123456789012345678");
out.C.uid29 = uidCheck("12345678901234567890123456789");
out.C.uid31 = uidCheck("1234567890123456789012345678901");
out.C.uid32 = uidCheck("12345678901234567890123456789012");
out.C.zone23 = zoneCheck("12345678901234567890123");
out.C.zone24 = zoneCheck("123456789012345678901234");
out.C.zone26 = zoneCheck("12345678901234567890123456");
out.C.pln27 = plnCheck("543210987654321098765432109");
out.C.pln28 = plnCheck("5432109876543210987654321098");
out.C.pln29 = plnCheck("54321098765432109876543210987");
out.C.pln31 = plnCheck("5432109876543210987654321098765");
out.C.wa26 = waCheck("08123456789012345678901234");
out.C.wa27 = waCheck("081234567890123456789012345");
out.C.wa28 = waCheck("0812345678901234567890123456");
out.C.hp27 = hpCheck("081234567890123456789012345");
out.C.hp28 = hpCheck("0812345678901234567890123456");
out.C.hp29 = hpCheck("08123456789012345678901234567");
out.C.hp31 = hpCheck("0812345678901234567890123456789");
// sanity: nilai sah tetap diterima
out.C.sanity = { uid8: uidCheck("12345678"), zone4: zoneCheck("1234"), pln12: plnCheck("543210987654"), wa13: waCheck("0812345678901"), hp13: hpCheck("0812345678901") };

// ---------- D. Harga ----------
const findGame = (id, name) => GAMES.find((g) => g.id === id).tabs[Object.keys(GAMES.find((g) => g.id === id).tabs).find((t) => GAMES.find((g) => g.id === id).tabs[t].some((i) => i.name === name))].find((i) => i.name === name);
const pay = (id) => ALL_PAYMENTS.find((p) => p.id === id);
const price = (id, promoId, payId, expected) => {
  const t = calcTotals(id, pay(payId), PROMOS[promoId]);
  return { base: id, promo: promoId, pay: payId, fee: t.fee, disc: t.disc, total: t.total, expected, cocok: t.total === expected };
};
out.D.d44 = price(262500, "ROSDI10", "qris", 252500); // Steam 250.000 tampil 262.500
out.D.d45 = price(432000, "GAMER5", "dana", 427250); // PSN 400.000 tampil 432.000
out.D.d46 = price(330000, "ROSDI10", "bca", 322500); // GP 300.000 tampil 330.000
out.D.d47 = price(379000, "ROSDI10", "dana", 369250); // Genshin 2240 GC
out.D.d48 = price(94000, "GAMER5", "gopay", 89550); // FF 720 DM
out.D.d49 = price(45000, "ROSDI10", "dana", 40750); // FF Booyah Pass
out.D.d50 = price(7200, "GAMER5", "qris", 6840); // HoK 80 Token
out.D.d51 = price(15500, "GAMER5", "qris", 14725); // Roblox 80 Robux
out.D.d52 = price(899000, "GAMER5", "bca", 896500); // CODM 5000 CP
out.D.d53 = price(164000, "GAMER5", "qris", 159000); // DF 680 DC
out.D.d54 = price(3850, "ROSDI10", "gopay", 3715); // MLBB 12 DM
out.D.d55 = price(202500, "GAMER5", "qris", 197500); // Token PLN 200.000 tampil 202.500
// verifikasi harga dasar dari data.js (bukan angka batch semata)
out.D.dasar = {
  genshin2240: GAMES.find((g) => g.id === "genshin-impact").tabs["Genesis Crystal"].find((i) => i.name === "2240 Genesis Crystal")?.price,
  ff720: GAMES.find((g) => g.id === "free-fire").tabs["Diamonds"].find((i) => i.name === "720 Diamonds")?.price,
  ffBooyah: GAMES.find((g) => g.id === "free-fire").tabs["Membership"].find((i) => i.name === "Booyah Pass")?.price,
  hok80: GAMES.find((g) => g.id === "honor-of-kings").tabs["Token"].find((i) => i.name === "80 Token")?.price,
  roblox80: GAMES.find((g) => g.id === "roblox").tabs["Robux"].find((i) => i.name === "80 Robux")?.price,
  codm5000: GAMES.find((g) => g.id === "cod-mobile").tabs["CP"].find((i) => i.name === "5000 CP")?.price,
  df680: GAMES.find((g) => g.id === "delta-force").tabs["Delta Coins"].find((i) => i.name === "680 Delta Coins")?.price,
  mlbb12: GAMES.find((g) => g.id === "mobile-legends").tabs["Diamonds"].find((i) => i.name === "12 Diamonds")?.price,
  steam250calc: Math.round(250000 * 1.05 / 100) * 100,
  psn400calc: Math.round(400000 * 1.08 / 100) * 100,
  gp300calc: Math.round(300000 * 1.1 / 100) * 100,
  pln200: PLN_ITEMS.find((i) => i.tokenValue === 200000)?.price,
};

// ---------- F. Kontras (WCAG) ----------
const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100; };
out.F = {
  badgeMinus5_light: { fg: "#b91c1c", bg: "#fef2f2", ratio: ratio("#b91c1c", "#fef2f2") },
  badgeMinus5_dark: { fg: "#f87171", bg: "#33161a", ratio: ratio("#f87171", "#33161a") },
  empty_light: { fg: "#5b6b82", bg: "#f6f8fb", ratio: ratio("#5b6b82", "#f6f8fb") },
  empty_dark: { fg: "#9db0c9", bg: "#0b1220", ratio: ratio("#9db0c9", "#0b1220") },
  note_sub_light: { fg: "#5b6b82", bg: "#f6f8fb", ratio: ratio("#5b6b82", "#f6f8fb") },
  note_sub_dark: { fg: "#9db0c9", bg: "#0b1220", ratio: ratio("#9db0c9", "#0b1220") },
  nav_light: { fg: "#5b6b82", bg: "#ffffff", ratio: ratio("#5b6b82", "#ffffff") },
  nav_dark: { fg: "#9db0c9", bg: "#131f36", ratio: ratio("#9db0c9", "#131f36") },
  nav_active_light: { fg: "#2563eb", bg: "#eff6ff", ratio: ratio("#2563eb", "#eff6ff") },
  nav_active_dark: { fg: "#60a5fa", bg: "#16294d", ratio: ratio("#60a5fa", "#16294d") },
};

// ---------- H. Deep link ----------
// App.jsx tidak pernah membaca location.search / URLSearchParams (grep 0 hit).
// Semua query di bawah diabaikan -> halaman default Beranda (akar s460-6).
out.H = {
  catatan: "App.jsx: hash-only routing; location.search tidak pernah dibaca (grep URLSearchParams/location.search = 0 hit di src/).",
  tab_pln: "diabaikan -> Beranda", tab_tagihan: "diabaikan -> Beranda",
  operator_byu: "diabaikan", operator_tri: "diabaikan",
  nominal_10000: "diabaikan", metode_dana: "diabaikan (case-insensitive pun tidak dibaca)",
  server_twhkmo: "diabaikan", qty_3: "diabaikan (qty awal useState(1))",
};

console.log(JSON.stringify(out, null, 1));
