// Replika Node 1:1 untuk audit batch s455 (pencarian B/C, validasi D/E,
// calcTotals F51-59, routing J91-95/97). Membaca src/data.js + src/lib.js
// langsung; logika disalin dari src/pages/*.jsx + src/App.jsx.
import { GAMES, OPERATORS, EWALLETS, VOUCHERS, FLASH_SALE, RIOT_ID_RE, PROMOS, calcTotals, ALL_PAYMENTS, PLN_ITEMS, DATA_PACKAGES } from "../src/data.js";
import { phoneOk } from "../src/lib.js";

const out = (id, v) => console.log(id, JSON.stringify(v));

// ---------- B/C. Pencarian (replika Home.jsx) ----------
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
  const showEmoney = ewallets.length > 0;
  const showVoucher = vouchers.length > 0;
  const hits = [];
  if (flash.length) hits.push(...flash.map((f) => "flash:" + f.name));
  if (games.length) hits.push(...games.map((g) => "game:" + g.name));
  if (showPulsa) hits.push("kartu:Pulsa Reguler");
  if (showData) hits.push("kartu:Paket Data");
  if (showPln) hits.push("kartu:Token PLN");
  if (showTagihan) hits.push("kartu:Tagihan Pascabayar");
  if (showEmoney) hits.push(...ewallets.map((w) => "emoney:" + w.name));
  if (showVoucher) hits.push(...vouchers.map((v) => "voucher:" + v.name));
  return hits;
};
const queries = {
  11: "membership mingguan", 12: "welkin moon", 13: "top up game", 14: "isi diamond",
  15: "beli voucher", 16: "pulsa murah", 17: "mlbb diamond", 18: "ff diamond",
  19: "genshin crystal", 20: "valorant point", 21: "google play voucher",
  22: "pln token", 23: "tagihan listrik", 24: "cek tagihan", 25: "gopay 50000",
  26: "ovo 100000", 27: "pulsa 100000", 28: "30000", 29: "75000", 30: "172 diamonds",
};
for (const [id, q] of Object.entries(queries)) out("Q" + id, { q, hits: search(q) });

// ---------- D. Validasi batas (replika GamePage/PhonePages/PlnPage) ----------
const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;
const uidClean = (v) => v.replace(/[\s-]/g, "").replace(ZW, "");
const zoneClean = (v) => v.replace(/[\s-]/g, "").replace(ZW, "");
const noLeadMinus = (v) => !/^\s*-/.test(v);
const notAllZero = (v) => !/^0+$/.test(v);
const idOk = (v) => /^\d{6,}$/.test(uidClean(v)) && noLeadMinus(v) && notAllZero(uidClean(v));
const zoneOk = (v) => /^\d{4,6}$/.test(zoneClean(v)) && noLeadMinus(v) && notAllZero(zoneClean(v));
const phoneClean = (p) => p.replace(/[\s().-]/g, "").replace(ZW, "").replace(/^\+?62/, "0");
const plnClean = (v) => v.replace(/[\s.-]/g, "").replace(ZW, "");
const plnOk = (v) => /^\d{11,12}$/.test(plnClean(v)) && !/^\s*-/.test(v) && !/^0+$/.test(plnClean(v));
const riotOk = (v) => RIOT_ID_RE.test(v.replace(/[\s]/g, "").replace(ZW, ""));
const waWarn = (wa) => { const c = wa.replace(/[\s-]/g, "").replace(ZW, "").replace(/^\+?62/, "0"); return wa.trim() !== "" && !phoneOk(c); };
out("D31", { uid12: idOk("123456789012") });
out("D32", { uid13: idOk("1234567890123") });
out("D33", { zone12: zoneOk("123456789012") });
out("D34", { hp18: phoneOk(phoneClean("081234567890123456")), clean: phoneClean("081234567890123456") });
out("D35", { pln8: plnOk("54321098") });
out("D36", { pln16: plnOk("5432109876543210") });
out("D37", { riot6: riotOk("Nama66#TAG") });
out("D38", { riot15: riotOk("Abcdefghijklmno#TAG") });
out("D39", { wa15warn: waWarn("081234567890123") });
out("D40", { wa6warn: waWarn("081234") });

// ---------- E. Validasi format ----------
const EMAIL_RE = /^(?!\.)(?!.*\.\.)(?!.*\.@)(?!.*@\.)[^\s@]+@[^\s@]+\.[A-Za-z0-9]{2,}$/;
const emailOk = (e) => { const t = e.replace(ZW, "").trim(); return EMAIL_RE.test(t) && t.length <= 254 && t.split("@")[0].length <= 64; };
out("E41", { mailUnderscoreDomain: emailOk("nama@mail_com.com") });
out("E42", { mailLeadHyphenDomain: emailOk("nama@-mail.com") });
out("E43", { mailSpaceAfterAt: emailOk("nama@ mail.com") });
out("E44", { riotDot: riotOk("Dr.Name#TAG") });
out("E45", { riotHyphenTag: riotOk("Nama#TA-G") });
out("E46", { uidDot: idOk("1234.5678") });
out("E47", { zoneDot: zoneOk("12.34") });
out("E48", { hpSlash: phoneOk(phoneClean("0812/3456/7890")), clean: phoneClean("0812/3456/7890") });
out("E49", { plnUnderscore: plnOk("5432_10987654") });
const cleanRef = (v) => v.replace(ZW, "").replace(/[\s]/g, "").toUpperCase();
out("E50", { enDash: cleanRef("RSD–DEMO1234"), equalsDemo: cleanRef("RSD–DEMO1234") === "RSD-DEMO1234" });

// ---------- F. calcTotals F51-59 ----------
const pay = (id) => ALL_PAYMENTS.find((p) => p.id === id);
const price = (label, base, payId, promo) => {
  const t = calcTotals(base, pay(payId), promo ? PROMOS[promo] : null);
  return { base, pay: payId, promo, ...t };
};
out("F51", price("FF 5 Diamonds", 1000, "qris", "GAMER5")); // harap disc 50, total 950
out("F52", price("Valorant 11000 Points", 1199000, "qris", "ROSDI10")); // disc cap 10000, total 1189000
out("F53", price("GP 5.000", 5500, "dana", "ROSDI10")); // disc 550, fee 250, total 5200
out("F54", price("PLN 50.000", 52500, "qris", "ROSDI10")); // disc 5250, total 47250
out("F55", price("Telkomsel 25.000", 26830, "qris", "ROSDI10")); // disc 2683, total 24147
out("F56", price("by.U 2GB", 9000, "dana", "GAMER5")); // disc 450, fee 250, total 8800
out("F57", price("MLBB 172 DM", 43500, "bca", "ROSDI10")); // disc 4350, fee 2500, total 41650
out("F58", price("MLBB 3 DM", 1650, "qris", "GAMER5")); // disc floor(82.5)=82, total 1568
out("F59", price("Weekly Pass flash", 27900, "qris", "GAMER5")); // disc 1395, total 26505
// Verifikasi harga dasar dari data.js (bukan hafalan batch)
const mlbb = GAMES.find((g) => g.id === "mobile-legends");
const ff = GAMES.find((g) => g.id === "free-fire");
const vl = GAMES.find((g) => g.id === "valorant");
const gp = VOUCHERS.find((v) => v.id === "google-play");
const tsel = OPERATORS.find((o) => o.id === "telkomsel");
const byu = DATA_PACKAGES.byu.find((p) => p.name === "Kuota by.U 2GB");
out("F-base", {
  ff5: ff.tabs.Diamonds.find((i) => i.name === "5 Diamonds").price,
  vl11000: vl.tabs.Points.find((i) => i.name === "11000 Points").price,
  gp5000: gp.items.find((i) => i.name === "Saldo 5.000").price,
  pln50000: PLN_ITEMS.find((i) => i.name === "Token 50.000").price,
  tsel25000: tsel.pulsa.find((i) => i.name === "Pulsa 25.000").price,
  byu2gb: byu.price,
  mlbb172: mlbb.tabs.Diamonds.find((i) => i.name === "172 Diamonds").price,
  mlbb3: mlbb.tabs.Diamonds.find((i) => i.name === "3 Diamonds").price,
  weeklyPass: mlbb.tabs["Weekly Pass"].find((i) => i.name === "Weekly Diamond Pass").price,
  weeklyPassWas: mlbb.tabs["Weekly Pass"].find((i) => i.name === "Weekly Diamond Pass").was,
});

// ---------- J. Routing (replika App.jsx) ----------
const route = (hash) => {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "game") { const g = GAMES.find((x) => x.id === parts[1]); return g ? "game:" + g.id : "HOME(fallback)"; }
  if (parts[0] === "pulsa" || parts[0] === "data") {
    if (!parts[1]) return "OperatorIndex:" + parts[0];
    const op = OPERATORS.find((o) => o.id === parts[1]); return op ? "PhonePage:" + op.id : "OperatorIndex(fallback):" + parts[0];
  }
  if (parts[0] === "pln") return "pln";
  if (parts[0] === "tagihan") {
    if (!parts[1]) return "BillIndex";
    const b = [{ id: "pln-pascabayar" }].find((x) => x.id === parts[1]); return b ? "BillPage" : "BillIndex(fallback)";
  }
  if (parts[0] === "emoney") return "emoney:" + (parts[1] || "index");
  if (parts[0] === "voucher") return "voucher:" + (parts[1] || "?");
  if (parts[0] === "cek") return "cek";
  if (parts[0] === "sukses") return "sukses";
  return "HOME";
};
out("J91", { hash: "#/game/free-fire?tab=membership", route: route("#/game/free-fire?tab=membership") });
out("J92", { hash: "#/pulsa/telkomsel?nominal=50000", route: route("#/pulsa/telkomsel?nominal=50000") });
out("J93", { hash: "#/game/mobile-legends?qty=5", route: route("#/game/mobile-legends?qty=5") });
out("J94", { hash: "#/game/genshin-impact?server=amerika", route: route("#/game/genshin-impact?server=amerika") });
out("J95", { hash: "#/cek/", route: route("#/cek/") });
out("J97", { hash: "#/game/mobile-legends?tab=diamond&promo=ROSDI10", route: route("#/game/mobile-legends?tab=diamond&promo=ROSDI10") });
out("J95b", { hash: "#/cek", route: route("#/cek") });
