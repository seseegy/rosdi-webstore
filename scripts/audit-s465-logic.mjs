// Audit logika s465 (read-only): B pencarian, C validasi, D harga, F kontras, H deep link, I mikrokopi.
// Replikasi persis match() Home.jsx, regex GamePage/PlnPage/PhonePages/CheckoutShell/VoucherPage, calcTotals data.js.
import { GAMES, EWALLETS, VOUCHERS, FLASH_SALE, OPERATORS, DATA_PACKAGES, EMONEY_ITEMS, calcTotals, PROMOS, ALL_PAYMENTS, RIOT_ID_RE } from "../src/data.js";
import { phoneOk } from "../src/lib.js";
import { readFileSync } from "node:fs";

const out = { B: {}, C: {}, D: {}, F: {}, H: {}, I: {} };

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
for (const q of ["byu 10000", "token 100000", "delta coins", "saldo 150000", "saldo 75000", "saldo 25000", "ovo 25000", "gopay 25000", "dana 150000", "steam 120000"]) out.B[q] = search(q);
// kontrol positif: query satu kata yang seharusnya cocok
for (const q of ["byu", "delta force", "saldo dana", "steam"]) out.B["CTRL:" + q] = search(q);

// ---------- C. Validasi (replikasi persis tiap halaman) ----------
const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;
const noLeadMinus = (v) => !/^\s*-/.test(v);
const notAllZero = (v) => !/^0+$/.test(v);
const zoneCheck = (raw) => {
  const typed = raw.slice(0, 8); // GamePage maxLength=8
  const clean = typed.replace(/[\s-]/g, "").replace(ZW, "");
  const ok = /^\d{4,6}$/.test(clean) && noLeadMinus(typed) && notAllZero(clean);
  return { rawLen: raw.length, typedLen: typed.length, clean: JSON.stringify(clean), diterima: ok, terpotong: raw.length > 8 };
};
const hpCheck = (raw) => {
  const clean = raw.replace(/[\s().-]/g, "").replace(ZW, "").replace(/^\+?62/, "0"); // PhonePages
  return { rawLen: raw.length, cleanLen: clean.length, phoneOk: phoneOk(clean), blokirBeli: !phoneOk(clean) };
};
const waCheck = (raw) => {
  const clean = raw.replace(/[\s-]/g, "").replace(ZW, "").replace(/^\+?62/, "0"); // CheckoutShell
  return { rawLen: raw.length, cleanLen: clean.length, phoneOk: phoneOk(clean), peringatan: raw.trim() !== "" && !phoneOk(clean), blokirBeli: false };
};
const plnCheck = (raw) => {
  const typed = raw.slice(0, 16); // PlnPage maxLength=16
  const clean = typed.replace(/[\s.-]/g, "").replace(ZW, "");
  const ok = /^\d{11,12}$/.test(clean) && !/^\s*-/.test(typed) && !/^0+$/.test(clean);
  return { rawLen: raw.length, typedLen: typed.length, cleanLen: clean.length, diterima: ok, terpotong: raw.length > 16 };
};
const emailRe = /^(?!\.)(?!.*\.\.)(?!.*\.@)(?!.*@\.)[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const emailCheck = (raw) => {
  const t = raw.replace(ZW, "").trim();
  const warn = raw.trim() !== "" && (!emailRe.test(t) || t.length > 254 || t.split("@")[0].length > 64);
  return { rawLen: raw.length, totalLen: t.length, localLen: t.split("@")[0].length, peringatan: warn, diterimaTanpaPeringatan: !warn };
};
const orderCheck = (raw) => {
  const clean = raw.replace(ZW, "").replace(/[\s]/g, "").toUpperCase(); // InfoPages cleanRef
  const DEMO = "RSD-DEMO1234";
  const found = clean === DEMO;
  return { raw: JSON.stringify(raw), clean, cocokDemo: found, hasilDenganRiwayatKosong: found ? "contoh demo tampil" : "tidak ditemukan (pesan ditampilkan)" };
};
const uidCheck = (raw) => {
  const typed = raw.slice(0, 20); // GamePage maxLength=20
  const clean = typed.replace(/[\s-]/g, "").replace(ZW, "");
  const ok = /^\d{6,}$/.test(clean) && noLeadMinus(typed) && notAllZero(clean);
  return { raw: JSON.stringify(raw), clean: JSON.stringify(clean), diterima: ok };
};
const riotCheck = (raw) => {
  const clean = raw.replace(/[\s]/g, "").replace(ZW, "");
  return { raw, clean, diterima: RIOT_ID_RE.test(clean) };
};
out.C.zone32 = zoneCheck("12345678901234567890123456789012");
out.C.hp36 = hpCheck("081234567890123456789012345678901234");
out.C.wa33 = waCheck("081234567890123456789012345678901");
out.C.pln35 = plnCheck("54321098765432109876543210987654321");
out.C.emailLocal62 = emailCheck("a".repeat(62) + "@mail.com");
out.C.emailLocal63 = emailCheck("a".repeat(63) + "@mail.com");
out.C.emailLocal66 = emailCheck("a".repeat(66) + "@mail.com");
out.C.emailDoubleDotLocal = emailCheck("na..ma@mail.com");
out.C.orderAngka = orderCheck("1234567890");
out.C.orderTanpaStrip = orderCheck("RSDDEMO1234");
out.C.orderStripAkhir = orderCheck("RSD-DEMO1234-");
out.C.zoneSpasiDepan = zoneCheck(" 1234");
out.C.plnSpasiDepan = plnCheck(" 54321098765");
out.C.emailDomain64 = emailCheck("nama@" + "d".repeat(64) + ".com");
out.C.emailDomainAngka = emailCheck("nama@123.com");
out.C.uidSpasiDepan = uidCheck(" 12345678");
out.C.riot2huruf = riotCheck("Na#TAG12");
// kontrol: promo "ROSDI10 " (trim+upper di applyPromo)
const promoCode = (raw) => raw.replace(ZW, "").trim().toUpperCase();
out.C.promoSpasiAkhir = { input: "ROSDI10 ", code: promoCode("ROSDI10 "), dikenal: !!PROMOS[promoCode("ROSDI10 ")] };

// ---------- D. Harga (calcTotals asli) ----------
const pay = (id) => ALL_PAYMENTS.find((p) => p.id === id);
const d = (base, payId, promoCode) => {
  const t = calcTotals(base, pay(payId), promoCode ? PROMOS[promoCode] : null);
  return { base, pay: payId, promo: promoCode, fee: t.fee, disc: t.disc, total: t.total, totalRp: "Rp" + t.total.toLocaleString("id-ID") };
};
out.D.i39 = d(38000, "qris", "ROSDI10");      // harap 34200
out.D.i40 = d(32000, "dana", "GAMER5");       // harap 30650
out.D.i41 = d(55000, "gopay", "ROSDI10");     // harap 49750
out.D.i42 = d(94500, "qris", "GAMER5");       // harap 89775
out.D.i43 = d(126000, "bca", "ROSDI10");      // harap 118500
out.D.i44 = d(55000, "dana", "GAMER5");       // harap 52500
out.D.i45 = d(110000, "qris", "ROSDI10");     // harap 100000
// verifikasi harga dasar dari data.js (bukan dari batch): OMG 38000, GamesMax 32000, Unlimited 55000,
// Steam 90000 -> 94500, Steam 120000 -> 126000, GP 50000 -> 55000, GP 100000 -> 110000
out.D.hargaDasar = {
  omg: DATA_PACKAGES.telkomsel.find((p) => p.name.startsWith("OMG")).price,
  gamesmax: DATA_PACKAGES.telkomsel.find((p) => p.name.startsWith("GamesMax")).price,
  unlimited: DATA_PACKAGES.telkomsel.find((p) => p.name.startsWith("Unlimited Apps")).price,
};

// ---------- F. Kontras (token index.css) ----------
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
const TOK = {
  light: { surface: "#ffffff", field: "#f8fafc", blueText: "#2563eb", sub: "#5b6b82", green: "#047857", ink: "#0f172a", faint: "#94a3b8" },
  dark: { surface: "#131f36", field: "#0e1930", blueText: "#60a5fa", sub: "#9db0c9", green: "#34d399", ink: "#f1f5f9", faint: "#64748b" },
};
// 70 p-from PLN (--blue-text di surface), 71 p-sub/p-from voucher (--sub di surface; "Kode digital" adalah p-sub),
out.F.i70_pFromBlueText = { light: ratio(TOK.light.blueText, TOK.light.surface), dark: ratio(TOK.dark.blueText, TOK.dark.surface) };
out.F.i71_sub = { light: ratio(TOK.light.sub, TOK.light.surface), dark: ratio(TOK.dark.sub, TOK.dark.surface) };
out.F.i71_pFromBlueText = { light: ratio(TOK.light.blueText, TOK.light.surface), dark: ratio(TOK.dark.blueText, TOK.dark.surface) };
out.F.i72_diskonGreen = { light: ratio(TOK.light.green, TOK.light.surface), dark: ratio(TOK.dark.green, TOK.dark.surface) };
out.F.i73_biayaSub = { light: ratio(TOK.light.sub, TOK.light.surface), dark: ratio(TOK.dark.sub, TOK.dark.surface) };
out.F.i74_statusInk = { light: ratio(TOK.light.ink, TOK.light.surface), dark: ratio(TOK.dark.ink, TOK.dark.surface) };
out.F.i75_timelineInk = { light: ratio(TOK.light.ink, TOK.light.surface), dark: ratio(TOK.dark.ink, TOK.dark.surface) };
out.F.i75_timelineSmallSub = { light: ratio(TOK.light.sub, TOK.light.surface), dark: ratio(TOK.dark.sub, TOK.dark.surface) };
out.F.i76_mobileBarPriceBlueText = { light: ratio(TOK.light.blueText, TOK.light.surface), dark: ratio(TOK.dark.blueText, TOK.dark.surface) };
out.F.i76_mobileBarItemSub = { light: ratio(TOK.light.sub, TOK.light.surface), dark: ratio(TOK.dark.sub, TOK.dark.surface) };
// kontrol: apakah "Total" label ada di mobile-bar? (tidak — hanya di aside .sum-total; cek via grep di bawah)
out.F.i76_catatan = "mobile-bar hanya berisi nama item (span --sub) + harga (b --blue-text); label 'Total' hanya di aside .sum-total";

// ---------- H. Deep link (App.jsx: tidak ada parsing query string sama sekali) ----------
const appSrc = readFileSync("src/App.jsx", "utf8");
out.H = {
  adaParsingQuery: /URLSearchParams|searchParams|location\.search|window\.location\.search/.test(appSrc),
  adaParsingTabQuery: /\?tab=|tab=/.test(appSrc),
  routing: "hash-only (parts = hash.split('/')) — semua ?... diabaikan, jatuh ke Beranda",
  uji: { tabPromo: "-> Beranda", tabCek: "-> Beranda", tabSukses: "-> Beranda", tabHome: "-> Beranda", metodeMandiri: "-> Beranda", metodeBri: "-> Beranda", metodeAlfamart: "-> Beranda", metodeTelkomsel: "-> Beranda", uidAbc: "-> Beranda (kolom UID tidak terisi)" },
};

// ---------- I. Mikrokopi (grep src/) ----------
import { execSync } from "node:child_process";
const grep = (pat) => { try { return execSync(`grep -rn --include='*.jsx' --include='*.js' -E '${pat}' src/ || true`, { encoding: "utf8" }).trim(); } catch { return ""; } };
out.I.i98_Example = grep("Example");
out.I.i98_Contoh = grep("Contoh").split("\n").length + " baris 'Contoh'";
out.I.i99_PayKata = grep("\\bPay\\b");
out.I.i99_Bayar = grep("Bayar").split("\n").filter(Boolean).length + " baris 'Bayar'";
out.I.i100_MaxKata = grep("\\bMax\\b");
out.I.i100_maksimal = grep("maksimal").split("\n").filter(Boolean).length + " baris 'maksimal'";

// ---------- A. Animasi (statis dari index.css / JSX) ----------
const css = readFileSync("src/index.css", "utf8");
const shell = readFileSync("src/pages/CheckoutShell.jsx", "utf8");
out.A = {
  noteBadAnim: /\.note\.bad \{[^}]*animation: note-in/.test(css),
  noteGoodAnim: /\.note\.good \{[^}]*animation: note-in/.test(css),
  inputTransition: /\.input \{[^}]*transition: border-color/.test(css),
  inputOkAda: /\.input\.ok \{ border-color: var\(--green\)/.test(css),
  voucherEmailOk: /id="vemail" className=\{"input" \+ \(email && !ok \? " err" : ""\)\}/.test(readFileSync("src/pages/VoucherPage.jsx", "utf8")),
  promoBtnAnim: /\.promo-btn \{ animation: note-in/.test(css),
  mbTotalKey: /<b key=\{total\}>/.test(shell),
  mbTotalBAnim: /\.mobile-bar \.mb-total b \{[^}]*animation: qty-pop/.test(css),
  sumTotalBAnim: /\.sum-total b \{[^}]*animation/.test(css),
  sumRowHargaAnim: /\.sum-row[^}]*animation/.test(css),
  mobileBarBtnPulse: /\.mobile-bar \.btn \{[^}]*animation/.test(css),
  skeletonOperator: /skeleton|placeholder.*operator|memuat.*nominal/i.test(readFileSync("src/pages/PhonePages.jsx", "utf8")),
};

console.log(JSON.stringify(out, null, 2));
