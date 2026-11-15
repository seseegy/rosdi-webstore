// Audit logika s467 (replikasi persis dari src/ — bukan tebakan).
// B: match() Home.jsx; C: validasi GamePage/PhonePages/PlnPage/CheckoutShell/VoucherPage/InfoPages;
// D: calcTotals data.js; F: kontras token index.css; I: grep teks UI.
import { writeFileSync } from "node:fs";
import { GAMES, OPERATORS, EWALLETS, VOUCHERS, FLASH_SALE, EMONEY_ITEMS, ALL_PAYMENTS, PROMOS, calcTotals, RIOT_ID_RE } from "../src/data.js";
import { phoneOk } from "../src/lib.js";

const out = {};

// ---------- B. Pencarian: replikasi match() Home.jsx ----------
const search = (q) => {
  const query = q.trim().toLowerCase();
  const match = (txt) => !query || txt.toLowerCase().includes(query);
  const games = GAMES.filter((g) => match(g.name + " " + g.publisher + " " + g.initials + " " + (g.aka || "")));
  const ewallets = EWALLETS.filter((w) => match(w.name));
  const vouchers = VOUCHERS.filter((v) => match(v.name + " voucher"));
  const flash = FLASH_SALE.filter((f) => match(f.name + " " + f.sub));
  const showPulsa = match("pulsa reguler telkomsel by.u byu indosat xl axis tri smartfren");
  const showData = match("paket data kuota internet");
  const showPln = match("token pln listrik");
  const showTagihan = match("tagihan pascabayar pln pdam bpjs telkom indihome tv kabel multifinance pbb");
  const nothing = !flash.length && !games.length && !showPulsa && !showData && !showPln && !showTagihan && !ewallets.length && !vouchers.length;
  return { games: games.map((g) => g.name), ewallets: ewallets.map((w) => w.name), vouchers: vouchers.map((v) => v.name), flash: flash.map((f) => f.name), showPulsa, showData, showPln, showTagihan, emptyState: nothing };
};
out.search = {};
for (const [id, q] of [[11, "saldo 250000"], [12, "pulsa 75000"], [13, "pulsa 25000"], [14, "gopay 500000"], [15, "dana 500000"], [16, "steam 250000"], [17, "voucher 200000"], [18, "blessing 62000"], [19, "ovo 150000"], [20, "gopay 150000"]]) out.search[id] = { query: q, ...search(q) };

// ---------- C. Validasi ----------
const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;
const noLeadMinus = (v) => !/^\s*-/.test(v);
const notAllZero = (v) => !/^0+$/.test(v);
// UID: input maxLength=20 (GamePage.jsx) — ketik asli terpotong sebelum validasi
const uidCheck = (raw) => {
  const typed = raw.slice(0, 20);
  const clean = typed.replace(/[\s-]/g, "").replace(ZW, "");
  const ok = /^\d{6,}$/.test(clean) && noLeadMinus(typed) && notAllZero(clean);
  return { mentah: raw.length, terpotongKe: typed.length, bersih: clean.length, diterima: ok };
};
// Zone: input maxLength=8
const zoneCheck = (raw) => {
  const typed = raw.slice(0, 8);
  const clean = typed.replace(/[\s-]/g, "").replace(ZW, "");
  const ok = /^\d{4,6}$/.test(clean) && noLeadMinus(typed) && notAllZero(clean);
  return { mentah: raw.length, terpotongKe: typed.length, bersih: clean.length, diterima: ok };
};
// HP: PhonePages clean + phoneOk (tanpa maxLength)
const hpCheck = (raw) => {
  const clean = raw.replace(/[\s().-]/g, "").replace(ZW, "").replace(/^\+?62/, "0");
  return { mentah: raw.length, bersih: clean.length, phoneOk: phoneOk(clean) };
};
// WA: CheckoutShell waClean + phoneOk (peringatan saja, tidak memblokir)
const waCheck = (raw) => {
  const clean = raw.replace(/[\s-]/g, "").replace(ZW, "").replace(/^\+?62/, "0");
  return { mentah: raw.length, bersih: clean.length, peringatan: raw.trim() !== "" && !phoneOk(clean) };
};
// PLN: maxLength=16
const plnCheck = (raw) => {
  const typed = raw.slice(0, 16);
  const clean = typed.replace(/[\s.-]/g, "").replace(ZW, "");
  const ok = /^\d{11,12}$/.test(clean) && !/^\s*-/.test(typed) && !/^0+$/.test(clean);
  return { mentah: raw.length, terpotongKe: typed.length, bersih: clean.length, diterima: ok };
};
// Email: regex CheckoutShell.jsx + batas RFC 5321
const EMAIL_RE = /^(?!\.)(?!.*\.\.)(?!.*\.@)(?!.*@\.)[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const emailCheck = (localLen, domainLen) => {
  const email = "a".repeat(localLen) + "@" + "d".repeat(domainLen) + ".com";
  const trim = email.replace(ZW, "").trim();
  const warn = trim !== "" && (!EMAIL_RE.test(trim) || trim.length > 254 || trim.split("@")[0].length > 64);
  return { email: email.slice(0, 12) + "...(total " + email.length + ")", localLen, domainLen, peringatan: warn, labelDomainMelewati63: domainLen > 63 };
};
// Nomor order: cleanRef + findOrder dengan riwayat kosong
const cleanRef = (v) => v.replace(ZW, "").replace(/[\s]/g, "").toUpperCase();
const orderCheck = (raw) => {
  const r = cleanRef(raw);
  const exact = [].find((o) => o.ref === r);
  const partial = [].filter((o) => o.ref.includes(r));
  const found = r === "RSD-DEMO1234" ? "DEMO" : (exact || (partial.length === 1 ? partial[0] : null));
  return { mentah: raw, dibersihkan: r, hasil: found === null ? "tidak ditemukan" : found === undefined ? "tidak ditemukan" : found };
};
out.validation = {
  21: { jenis: "Zone 34 digit", ...zoneCheck("1234567890123456789012345678901234") },
  22: { jenis: "HP 38 digit", ...hpCheck("08123456789012345678901234567890123456") },
  23: { jenis: "WA 34 digit", ...waCheck("0812345678901234567890123456789012"), catatan: "DUPLIKAT s466 ide 23 — string sama persis" },
  24: { jenis: "PLN 37 digit", ...plnCheck("5432109876543210987654321098765432109") },
  25: { jenis: "Email local 60", ...emailCheck(60, 4) },
  26: { jenis: "Email local 68", ...emailCheck(68, 4) },
  27: { jenis: "Email domain 62", ...emailCheck(4, 62) },
  28: { jenis: "Order RSD-A1B2C3D4", ...orderCheck("RSD-A1B2C3D4") },
  29: { jenis: "Zone 35 digit", ...zoneCheck("12345678901234567890123456789012345") },
  30: { jenis: "HP 39 digit", ...hpCheck("081234567890123456789012345678901234567") },
  31: { jenis: "WA 36 digit", ...waCheck("081234567890123456789012345678901234"), catatan: "teks batch salah sebut 'WA 35 digit ide 23' — ide 23 itu 34 digit" },
  32: { jenis: "PLN 38 digit", ...plnCheck("54321098765432109876543210987654321098") },
  33: { jenis: "Email local 59", ...emailCheck(59, 4) },
  34: { jenis: "Email local 69", ...emailCheck(69, 4) },
  35: { jenis: "Email domain 61", ...emailCheck(4, 61) },
  36: { jenis: "Email domain 65", ...emailCheck(4, 65) },
  37: { jenis: "UID 23 digit", ...uidCheck("12345678901234567890123") },
  38: { jenis: "UID 37 digit", ...uidCheck("1234567890123456789012345678901234567") },
};

// ---------- D. Harga: calcTotals asli ----------
const findItem = (gameId, itemName) => {
  const g = GAMES.find((x) => x.id === gameId);
  for (const tab of Object.values(g.tabs)) { const it = tab.find((i) => i.name === itemName); if (it) return it; }
  return null;
};
const pay = (id) => ALL_PAYMENTS.find((p) => p.id === id);
out.prices = {};
for (const [id, gameId, itemName, promoId, payId, klaim] of [
  [39, "mobile-legends", "514 Diamonds", "ROSDI10", "qris", 119000],
  [40, "cod-mobile", "800 CP", "GAMER5", "qris", 144000],
  [41, "valorant", "5350 Points", "ROSDI10", "bca", 591500],
  [42, "wild-rift", "3275 Wild Cores", "GAMER5", "dana", 494250],
  [43, "arena-of-valor", "950 Voucher", "ROSDI10", "gopay", 279250],
  [44, "valorant", "3650 Points", "GAMER5", "gopay", 414250],
  [45, "honor-of-kings", "800 Token", "ROSDI10", "dana", 64150],
]) {
  const item = findItem(gameId, itemName);
  const t = calcTotals(item.price, pay(payId), PROMOS[promoId]);
  out.prices[id] = { item: itemName, base: item.price, promo: promoId, pay: payId, ...t, klaimBatch: klaim, cocok: t.total === klaim };
}

// ---------- F. Kontras token (WCAG: (L1+0.05)/(L2+0.05)) ----------
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
const TOK = {
  light: { sub: "#5b6b82", faint: "#94a3b8", surface: "#ffffff", field: "#f8fafc", ink: "#0f172a", blueText: "#2563eb" },
  dark: { sub: "#9db0c9", faint: "#64748b", surface: "#131f36", field: "#0e1930", ink: "#f1f5f9", blueText: "#60a5fa" },
};
out.contrast = {
  61: { elemen: ".p-sub (tagline 'Via Riot ID + tag') di atas --surface", light: ratio(TOK.light.sub, TOK.light.surface), dark: ratio(TOK.dark.sub, TOK.dark.surface) },
  62: { elemen: "placeholder (var(--sub)) di atas --field", light: ratio(TOK.light.sub, TOK.light.field), dark: ratio(TOK.dark.sub, TOK.dark.field) },
  70: { elemen: "placeholder email Detail Kontak (var(--sub)) di atas --field", light: ratio(TOK.light.sub, TOK.light.field), dark: ratio(TOK.dark.sub, TOK.dark.field) },
  71: { elemen: "placeholder UID (var(--sub)) di atas --field", light: ratio(TOK.light.sub, TOK.light.field), dark: ratio(TOK.dark.sub, TOK.dark.field) },
  72: { elemen: ".n-meta 'Ditumpuk 2 minggu' (var(--sub)) di atas --field", light: ratio(TOK.light.sub, TOK.light.field), dark: ratio(TOK.dark.sub, TOK.dark.field) },
  73: { elemen: ".n-meta '90 GC/hari selama 30 hari' (var(--sub)) di atas --field", light: ratio(TOK.light.sub, TOK.light.field), dark: ratio(TOK.dark.sub, TOK.dark.field) },
  75: { elemen: ".n-meta 'Skin epic + hadiah misi' (var(--sub)) di atas --field", light: ratio(TOK.light.sub, TOK.light.field), dark: ratio(TOK.dark.sub, TOK.dark.field) },
};
// Keberadaan teks meta/tagline di data.js
const allMeta = GAMES.flatMap((g) => Object.values(g.tabs).flatMap((t) => t.map((i) => i.meta).filter(Boolean)));
out.teksAda = {
  taglineValorant: GAMES.find((g) => g.id === "valorant").tagline,
  taglineWildRift: GAMES.find((g) => g.id === "wild-rift").tagline,
  metaDitumpuk: allMeta.includes("Ditumpuk 2 minggu"),
  metaWelkin: allMeta.includes("90 GC/hari selama 30 hari"),
  metaTwilight: allMeta.includes("Skin epic + hadiah misi"),
};
// EMONEY: Saldo 250.000 memang tidak ada (ide 11)
out.emoney250k = EMONEY_ITEMS.some((i) => i.name.includes("250.000"));

writeFileSync(new URL("../hidden_files/audit-s467-logic.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
