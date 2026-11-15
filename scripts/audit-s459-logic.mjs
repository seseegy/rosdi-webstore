// Audit logika s459 (Node 1:1 dari src/data.js + src/lib.js + logika Home.jsx):
// B11-25 pencarian, C26-40 validasi, D41-52 calcTotals, F65-70 kontras WCAG,
// I93-100 hitungan grep (grep mentah dilakukan di shell; di sini angka kunci).
import {
  GAMES, EWALLETS, VOUCHERS, FLASH_SALE, DATA_PACKAGES,
  EMONEY_ITEMS, PROMOS, ALL_PAYMENTS, calcTotals, RIOT_ID_RE,
} from "../src/data.js";
import { phoneOk } from "../src/lib.js";

const out = {};
const rec = (id, v) => { out[id] = v; console.log(id, JSON.stringify(v)); };

// ---------- B. Pencarian: replika persis Home.jsx (cat default "semua") ----------
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
  ["B11", "ff 1000"], ["B12", "hok 1000"], ["B13", "roblox 1000"], ["B14", "codm 100"],
  ["B15", "axis 10000"], ["B16", "smartfren 10000"], ["B17", "indosat 10000"],
  ["B18", "gopay 20000"], ["B19", "google play 50000"], ["B20", "spotify"],
  ["B21", "xbox"], ["B22", "beli pulsa"], ["B23", "beli token"],
  ["B24", "sakuku"], ["B25", "seabank"],
]) rec(id, { q, ...homeSearch(q) });

// ---------- C. Validasi: replika GamePage/PhonePages/PlnPage/CheckoutShell ----------
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
rec("C26", { input: "UID 21 digit", uidOk: uidOk("123456789012345678901"), catatan: "input maxLength=20 (GamePage.jsx) — ketik/tempel 21 digit terpotong jadi 20 di browser" });
rec("C27", { input: "UID 25 digit", uidOk: uidOk("1234567890123456789012345") });
rec("C28", { input: "UID 30 digit", uidOk: uidOk("123456789012345678901234567890") });
rec("C29", { input: "Zone 16 digit", zoneOk: zoneOk("1234567890123456"), catatan: "input maxLength=8 — tempel 16 digit terpotong jadi 8 ('12345678'), lalu zoneOk 8 digit = false" });
rec("C30", { input: "Zone 20 digit", zoneOk: zoneOk("12345678901234567890") });
rec("C31", { input: "HP 5 digit '08123'", hpOk: hpOk("08123"), clean: hpClean("08123") });
rec("C32", { input: "PLN 21 digit", plnOk: plnOk("543210987654321098765"), catatan: "input maxLength=16 — terpotong jadi 16 digit, tetap ditolak (bukan 11-12)" });
rec("C33", { input: "PLN 25 digit", plnOk: plnOk("5432109876543210987654321") });
rec("C34", { input: "WA 5 digit '08123'", waWarn: waWarn("08123"), note: "WA hanya peringatan, tidak memblokir Beli" });
rec("C35", { input: "WA 20 digit", waWarn: waWarn("08" + "1".repeat(18)), cleanLen: waClean("08" + "1".repeat(18)).length });
rec("C36", { input: "WA 21 digit", waWarn: waWarn("08" + "1".repeat(19)), cleanLen: waClean("08" + "1".repeat(19)).length });
rec("C37", { input: "Riot 'NamaSatuDua#TAG12' (nama 11)", riotOk: riotOk("NamaSatuDua#TAG12") });
rec("C38", { input: "Riot 'NamaSatuDuaT#TAG12' (nama 12)", riotOk: riotOk("NamaSatuDuaT#TAG12") });
rec("C39", { input: "Riot 'NamaSatuDuaTiga#TAG12' (nama 14)", riotOk: riotOk("NamaSatuDuaTiga#TAG12") });
rec("C40", { input: "Email 'nama@mail.co' (TLD .co, 2 huruf)", emailWarn: emailWarn("nama@mail.co") });

// ---------- D. Harga: calcTotals asli + harga dasar dari data.js ----------
const findGameItem = (gameId, name) => {
  const g = GAMES.find((x) => x.id === gameId);
  for (const t of Object.values(g.tabs)) { const it = t.find((i) => i.name === name); if (it) return it; }
  return null;
};
const price = (label, got, want) => ({ label, got, want, sama: got === want });
rec("D-base", [
  price("Valorant 475 Points", findGameItem("valorant", "475 Points").price, 59000),
  price("Telkomsel Internet Sakti 5GB", DATA_PACKAGES.telkomsel.find((i) => i.name === "Internet Sakti 5GB").price, 18000),
  price("Steam Wallet 45.000", VOUCHERS.find((v) => v.id === "steam-wallet").items.find((i) => i.name === "Steam Wallet 45.000").price, 47300),
  price("Kuota by.U 5GB", DATA_PACKAGES.byu.find((i) => i.name === "Kuota by.U 5GB").price, 20000),
  price("AoV 40 Voucher", findGameItem("arena-of-valor", "40 Voucher").price, 15000),
  price("Delta Force 60 Delta Coins", findGameItem("delta-force", "60 Delta Coins").price, 15000),
  price("Wild Rift 475 Wild Cores", findGameItem("wild-rift", "475 Wild Cores").price, 79000),
  price("MLBB 3 Diamonds", findGameItem("mobile-legends", "3 Diamonds").price, 1650),
  price("PUBG 325 UC", findGameItem("pubg-mobile", "325 UC").price, 72000),
  price("HoK 240 Token", findGameItem("honor-of-kings", "240 Token").price, 21500),
  price("OVO Saldo 20.000", EMONEY_ITEMS.find((i) => i.name === "Saldo 20.000").price, 20492),
  price("Genshin 60 Genesis Crystal", findGameItem("genshin-impact", "60 Genesis Crystal").price, 12500),
]);
const check = (id, base, payId, promoCode, want) => {
  const pay = ALL_PAYMENTS.find((p) => p.id === payId);
  const t = calcTotals(base, pay, promoCode ? PROMOS[promoCode] : null);
  rec(id, { base, pay: pay.name, fee: t.fee, disc: t.disc, total: t.total, want, sama: t.total === want });
};
check("D41", 59000, "qris", "GAMER5", 56050);
check("D42", 18000, "qris", "GAMER5", 17100);
check("D43", 47300, "qris", "ROSDI10", 42570);
check("D44", 20000, "gopay", "ROSDI10", 18250);
check("D45", 15000, "pulsa-tsel", "ROSDI10", 14550);
check("D46", 15000, "alfamart", "GAMER5", 16750);
check("D47", 79000, "bca", "GAMER5", 77550);
check("D48", 1650, "pulsa-tsel", "GAMER5", 1684);
check("D49", 72000, "qris", "ROSDI10", 64800);
check("D50", 21500, "dana", "GAMER5", 20675);
check("D51", 20492, "bca", "ROSDI10", 20943);
check("D52", 12500, "qris", "GAMER5", 11875);

// ---------- F. Kontras WCAG ----------
const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
rec("F-contrast", {
  // 65: tombol .btn putih di atas --blue (Light) / --blue-strong Dark (s458 ide 68-70)
  cekNama_putih_light: ratio("#ffffff", "#2563eb"), cekNama_putih_dark: ratio("#ffffff", "#2563eb"),
  // 66: tombol .btn.ghost "Salin" — --ink di atas --surface
  salin_ghost_light: ratio("#0f172a", "#ffffff"), salin_ghost_dark: ratio("#f1f5f9", "#131f36"),
  // 67+68: .hint-link / .sec-head .more — --blue-text di atas --surface
  link_bluetext_light: ratio("#2563eb", "#ffffff"), link_bluetext_dark: ratio("#60a5fa", "#131f36"),
  // 69: .note --sub di atas --surface
  note_sub_light: ratio("#5b6b82", "#ffffff"), note_sub_dark: ratio("#9db0c9", "#131f36"),
  // 70: .n-meta --sub di atas --field
  nmeta_sub_light: ratio("#5b6b82", "#f8fafc"), nmeta_sub_dark: ratio("#9db0c9", "#0e1930"),
  AA: 4.5,
});

// ---------- I. Mikrokopi: jumlah Terlaris + label ----------
const terlaris = [];
for (const g of GAMES) for (const items of Object.values(g.tabs)) for (const it of items) if (it.badge === "Terlaris") terlaris.push(g.name + " / " + it.name);
rec("I-terlaris", { jumlahItemTerlarisDataJs: terlaris.length, daftar: terlaris });
console.log("SELESAI-LOGIC");
