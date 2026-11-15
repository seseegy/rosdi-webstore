// Replika logika s456 (read-only): pencarian Home.jsx, validasi GamePage/
// PhonePages/PlnPage/InfoPages/CheckoutShell, calcTotals data.js.
// Replika 1:1 dari sumber — regex & clean disalin persis dari file aslinya.
import {
  GAMES, EWALLETS, VOUCHERS, FLASH_SALE, calcTotals, PROMOS,
  ALL_PAYMENTS, detectOperator, OPERATORS, PLN_ITEMS, EMONEY_ITEMS,
  RIOT_ID_RE, DATA_PACKAGES,
} from "../src/data.js";
import { phoneOk } from "../src/lib.js";

const out = {};
const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;

// ---------- B/C: pencarian Home.jsx:38-48 (cat = "semua") ----------
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
  return {
    games: games.map((g) => g.name),
    ewallets: ewallets.map((w) => w.name),
    vouchers: vouchers.map((v) => v.name),
    flash: flash.map((f) => f.name),
    sections: [showPulsa && "Pulsa", showData && "Data", showPln && "PLN", showTagihan && "Tagihan"].filter(Boolean),
  };
};
const queries = {
  11: "crystal genshin", 12: "uc pubg mobile", 13: "voucher google play 50000",
  14: "token pln 50000", 15: "kuota telkomsel", 16: "voucher playstation",
  17: "psn wallet", 18: "cod points", 19: "wild cores", 20: "delta force coins",
  21: "10rb", 22: "20rb", 23: "1jt", 24: "mlbb?", 25: "topup ml",
  26: "wildrift", 27: "deltaforce", 28: "arenaofvalor", 29: "honorofkings",
  30: "booyah pass",
};
for (const [id, q] of Object.entries(queries)) out["search" + id] = { q, ...search(q) };

// ---------- D/E: validasi ----------
const noLeadMinus = (v) => !/^\s*-/.test(v);
const notAllZero = (v) => !/^0+$/.test(v);
const uidOk = (uid) => {
  const c = uid.replace(/[\s-]/g, "").replace(ZW, "");
  return /^\d{6,}$/.test(c) && noLeadMinus(uid) && notAllZero(c);
};
const zoneOk = (z) => {
  const c = z.replace(/[\s-]/g, "").replace(ZW, "");
  return /^\d{4,6}$/.test(c) && noLeadMinus(z) && notAllZero(c);
};
const hpValid = (phone) => {
  const clean = phone.replace(/[\s().-]/g, "").replace(ZW, "").replace(/^\+?62/, "0");
  const detected = detectOperator(clean);
  const unknownOp = clean.length >= 10 && !detected;
  return { clean, detected: detected?.id || null, phoneOk: phoneOk(clean), unknownOp, valid: phoneOk(clean) && !unknownOp };
};
const plnOk = (idpel) => {
  const c = idpel.replace(/[\s.-]/g, "").replace(ZW, "");
  return /^\d{11,12}$/.test(c) && !/^\s*-/.test(idpel) && !/^0+$/.test(c);
};
const riotOk = (r) => RIOT_ID_RE.test(r.replace(/[\s]/g, "").replace(ZW, ""));
const waWarn = (wa) => {
  const c = wa.replace(/[\s-]/g, "").replace(ZW, "").replace(/^\+?62/, "0");
  return { clean: c, warn: wa.trim() !== "" && !phoneOk(c) };
};
const cleanRef = (v) => v.replace(ZW, "").replace(/[\s]/g, "").toUpperCase();
const DEMO_REF = "RSD-DEMO1234";
const findOrder = (r, orders) => {
  if (!r) return undefined;
  if (r === DEMO_REF) return { ref: r, demo: true };
  const exact = orders.find((o) => o.ref === r);
  if (exact) return exact;
  const partial = orders.filter((o) => o.ref.includes(r));
  return partial.length === 1 ? partial[0] : null;
};
const promoKnown = (code) => !!PROMOS[code.replace(ZW, "").trim().toUpperCase()];

out.d31_uid14 = { v: "12345678901234", ok: uidOk("12345678901234"), note: "input maxLength=20, 14<=20" };
out.d32_zone13 = { v: "1234567890123", ok: zoneOk("1234567890123"), note: "input maxLength=8 jg memotong" };
out.d33_hp19 = hpValid("0812345678901234567");
out.d34_hp20 = hpValid("08123456789012345678");
out.d35_hp21 = hpValid("081234567890123456789");
out.d36_pln17 = { v: "54321098765432101", ok: plnOk("54321098765432101") };
out.d37_pln18 = { v: "543210987654321012", ok: plnOk("543210987654321012") };
out.d38_riot7 = { v: "Pemain#TAG12", ok: riotOk("Pemain#TAG12") };
out.d39_riot14 = { v: "PemainPanjang14#TAG12", ok: riotOk("PemainPanjang14#TAG12") };
out.d40_wa16 = waWarn("0812345678901234");
out.e41_hpAllZero = hpValid("08000000000");
out.e42_hpPlus0 = hpValid("+081234567890");
out.e43_riotEmptyTag = { v: "Nama#", ok: riotOk("Nama#") };
out.e44_riotDigits = { v: "12345#TAG", ok: riotOk("12345#TAG") };
out.e45_cekDoubleSpace = { raw: "RSD-  DEMO1234", clean: cleanRef("RSD-  DEMO1234"), found: !!findOrder(cleanRef("RSD-  DEMO1234"), []) };
out.e46_uidComma = { v: "1234,5678", ok: uidOk("1234,5678") };
out.e47_cekUnderscore = { raw: "RSD_DEMO1234", clean: cleanRef("RSD_DEMO1234"), found: findOrder(cleanRef("RSD_DEMO1234"), []) };
out.e48_cekDot = { raw: "RSD.DEMO1234", clean: cleanRef("RSD.DEMO1234"), found: findOrder(cleanRef("RSD.DEMO1234"), []) };
out.e49_promoUnderscore = { code: "ROSDI_10", known: promoKnown("ROSDI_10") };
out.e50_promoDot = { code: "ROSDI.10", known: promoKnown("ROSDI.10") };

// ---------- F: calcTotals 51-60 (harga diambil dari data.js) ----------
const payBy = (name) => ALL_PAYMENTS.find((p) => p.name === name);
const itemPrice = (gameId, itemName) => {
  const g = GAMES.find((x) => x.id === gameId);
  if (!g) return null;
  for (const tab of Object.values(g.tabs || {})) {
    const it = tab.find((i) => i.name === itemName);
    if (it) return it.price;
  }
  return null;
};
const F = (id, base, promoCode, payName) => {
  const pay = payBy(payName);
  const t = calcTotals(base, pay, PROMOS[promoCode]);
  return { id, base, promo: promoCode, pay: payName, fee: t.fee, disc: t.disc, total: t.total };
};
const pln100 = PLN_ITEMS.find((i) => /100\.000|100000/.test(i.name));
const xl5gb = DATA_PACKAGES.xl.find((i) => /Xtra Combo 5GB/.test(i.name));
out.f51 = F(51, itemPrice("honor-of-kings", "16 Token"), "ROSDI10", "GoPay");
out.f52 = F(52, itemPrice("roblox", "400 Robux"), "GAMER5", "DANA");
out.f53 = F(53, itemPrice("arena-of-valor", "100 Voucher"), "ROSDI10", "BCA Virtual Account");
out.f54 = F(54, itemPrice("delta-force", "60 Delta Coins"), "GAMER5", "QRIS");
out.f55 = F(55, itemPrice("wild-rift", "475 Wild Cores"), "ROSDI10", "DANA");
out.f56 = F(56, itemPrice("cod-mobile", "80 CP"), "GAMER5", "GoPay");
out.f57 = F(57, pln100?.price, "GAMER5", "GoPay");
out.f58 = F(58, xl5gb?.price, "GAMER5", "BCA Virtual Account");
out.f59 = F(59, itemPrice("mobile-legends", "86 Diamonds"), "GAMER5", "DANA");
out.f60 = F(60, itemPrice("genshin-impact", "60 Genesis Crystal"), "ROSDI10", "QRIS");
out.f57_plnItem = pln100;
out.f58_xlItem = xl5gb;

// ---------- G: hitungan data.js (nilai harap untuk Figma) ----------
const gItems = (id) => {
  const g = GAMES.find((x) => x.id === id);
  return Object.values(g.tabs || {}).flat().map((i) => i.name);
};
out.g61_cod = gItems("cod-mobile");
out.g62_wr = gItems("wild-rift");
out.g63_df = gItems("delta-force");
out.g64_xl = OPERATORS.find((o) => o.id === "xl")?.pulsa?.map((i) => i.name);
out.g65_tri = OPERATORS.find((o) => o.id === "tri")?.pulsa?.map((i) => i.name);
out.g66_gopay = EMONEY_ITEMS.map((i) => i.name);
out.g67_ovo = EMONEY_ITEMS.map((i) => i.name);
const voucher = (id) => VOUCHERS.find((v) => v.id === id);
out.g68_psn = voucher("psn") || VOUCHERS.filter((v) => /PlayStation/i.test(v.name));
out.g69_steam = voucher("steam") || VOUCHERS.filter((v) => /Steam/i.test(v.name));
out.voucherIds = VOUCHERS.map((v) => ({ id: v.id, name: v.name, items: v.items?.map((i) => i.name) }));
out.operatorIds = OPERATORS.map((o) => ({ id: o.id, n: o.items?.length }));

console.log(JSON.stringify(out, null, 1));
