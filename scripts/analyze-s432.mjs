// Analisis data.js + logika untuk batch s432 (ide A11-A30, B12-B20, C21-C30,
// D31-D36, E41-E50, I87-I88). Satu tarikan data dipakai banyak ide.
// Usage: node scripts/analyze-s432.mjs > <outDir>/analyze-data.json
import {
  GAMES, OPERATORS, DATA_PACKAGES, PROMOS, calcTotals, payFee,
  ALL_PAYMENTS, rp, VOUCHERS, EMONEY_ITEMS, detectOperator,
} from "../src/data.js";

const out = {};
const rec = (id, v) => { out[id] = v; };

// ---- B11: game satu tab
rec(11, GAMES.map((g) => ({ game: g.name, tabs: Object.keys(g.tabs) })));

// ---- B12/B13: aritmetika meta "X + Y bonus"
const bonus = [];
for (const g of GAMES) for (const [, items] of Object.entries(g.tabs)) for (const it of items) {
  if (!it.meta) continue;
  const m = it.meta.match(/^(\d+)\s*\+\s*(\d+)\s*bonus$/);
  if (m) {
    const n = parseInt(it.name.match(/^(\d+)/)?.[1] || "0", 10);
    bonus.push({ game: g.name, item: it.name, meta: it.meta, sum: +m[1] + +m[2], nameNum: n, ok: +m[1] + +m[2] === n });
  }
}
rec(12, bonus);
rec(13, { bonusMetas: bonus.length, allOk: bonus.every((b) => b.ok), gamesWithBonus: [...new Set(bonus.map((b) => b.game))] });

// ---- B14: tab kosong
rec(14, GAMES.flatMap((g) => Object.entries(g.tabs).map(([t, items]) => ({ game: g.name, tab: t, count: items.length }))));

// ---- B15: tagline vs mekanisme
rec(15, GAMES.map((g) => ({ game: g.name, tagline: g.tagline, needsZone: !!g.needsZone, riotId: !!g.riotId, servers: g.servers || null })));

// ---- B18: urutan game vs harga from
rec(18, { order: GAMES.map((g) => ({ name: g.name, from: g.from })), sortedByFrom: [...GAMES].map((g) => g.from).every((v, i, a) => i === 0 || a[i - 1] <= v) });

// ---- B19: nama item terpanjang
{
  const all = [];
  for (const g of GAMES) for (const [tab, items] of Object.entries(g.tabs)) for (const it of items) all.push({ game: g.name, tab, name: it.name, len: it.name.length, price: it.price });
  all.sort((a, b) => b.len - a.len);
  rec(19, all.slice(0, 6));
}
// ---- B20: syarat ID per game
rec(20, GAMES.map((g) => ({ game: g.name, needsZone: !!g.needsZone, riotId: !!g.riotId, servers: (g.servers || []).length })));

// ---- C21: paket data per operator per rentang harga
rec(21, Object.entries(DATA_PACKAGES).map(([op, pkgs]) => ({
  op, count: pkgs.length,
  kecil: pkgs.filter((p) => p.price < 25000).length,
  menengah: pkgs.filter((p) => p.price >= 25000 && p.price <= 60000).length,
  besar: pkgs.filter((p) => p.price > 60000).length,
  min: Math.min(...pkgs.map((p) => p.price)), max: Math.max(...pkgs.map((p) => p.price)),
})));
// ---- C22/C23/C24: pola nama, masa aktif, urutan harga
rec(22, Object.entries(DATA_PACKAGES).map(([op, pkgs]) => ({ op, names: pkgs.map((p) => p.name) })));
rec(23, Object.entries(DATA_PACKAGES).map(([op, pkgs]) => ({ op, tanpaMasaAktif: pkgs.filter((p) => !/hari/.test(p.meta)).map((p) => p.name) })));
rec(24, Object.entries(DATA_PACKAGES).map(([op, pkgs]) => ({
  op, prices: pkgs.map((p) => p.price),
  ascending: pkgs.map((p) => p.price).every((v, i, a) => i === 0 || a[i - 1] <= v),
})));
// ---- C25: min operator index
rec(25, OPERATORS.map((o) => ({
  op: o.name,
  minPulsa: Math.min(...o.pulsa.map((i) => i.price)),
  minData: DATA_PACKAGES[o.id] ? Math.min(...DATA_PACKAGES[o.id].map((i) => i.price)) : null,
  hasTransfer: !!o.transfer,
})));
// ---- C26: operator pulsa vs data
rec(26, { pulsaOps: OPERATORS.map((o) => o.name), dataOps: OPERATORS.filter((o) => DATA_PACKAGES[o.id]).map((o) => o.name) });
// ---- C28: tabrakan prefix
{
  const seen = {};
  const dup = [];
  for (const o of OPERATORS) for (const p of o.prefixes) {
    if (seen[p]) dup.push({ prefix: p, a: seen[p], b: o.name });
    seen[p] = o.name;
  }
  rec(28, { totalPrefixes: Object.keys(seen).length, duplicates: dup });
}
// ---- C30: deteksi operator
rec(30, ["081234567890", "085112345678", "089612345678", "088812345678"].map((n) => ({ phone: n, detected: detectOperator(n)?.name || null })));

// ---- D31-D36: aritmetika calcTotals
const qris = ALL_PAYMENTS.find((p) => p.id === "qris");
const gopay = ALL_PAYMENTS.find((p) => p.id === "gopay");
const pulsaTsel = ALL_PAYMENTS.find((p) => p.id === "pulsa-tsel");
rec(31, { base1: 43500, qty10: calcTotals(43500 * 10, qris, PROMOS.ROSDI10), discFromSubtotal: Math.min(Math.floor(435000 * 0.10), 10000), discFromUnit: Math.min(Math.floor(43500 * 0.10), 10000) * 10 });
rec(32, { qty10odd: calcTotals(51907 * 10, pulsaTsel, null), perItemRoundedX10: Math.round(51907 * 0.07) * 10, feeFromSubtotal: Math.round(51907 * 10 * 0.07) });
rec(33, { flashQty10: calcTotals(27900 * 10, qris, null), wasUnit: 30900, wasX10: 309000 });
rec(34, { gamer5: PROMOS.GAMER5, hasMin: "min" in PROMOS.GAMER5 });
rec(35, { bigBase: calcTotals(1002500 * 10, qris, PROMOS.ROSDI10), rawDisc: Math.floor(10025000 * 0.10), cap: PROMOS.ROSDI10.cap });
rec(36, { bigEwallet: calcTotals(1002500 * 10, gopay, null), feeFlat: payFee(gopay, 10025000) });
rec(39, { odd: rp(99942), odd2: rp(51907), format: rp(99942) === "Rp99.942" });

// ---- E41-E46: validator (replika regex kode)
const uidOk = (s) => /^\d{6,}$/.test(s.trim());
const zoneOk = (s) => /^\d{4,6}$/.test(s.trim());
const plnOk = (s) => /^\d{11,12}$/.test(s.replace(/[\s-]/g, ""));
const phoneOk = (p) => /^08\d{8,11}$/.test(p.replace(/[\s-]/g, ""));
const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
rec(41, { "0": uidOk("0"), "0000": uidOk("0000"), "000000": uidOk("000000"), "123456": uidOk("123456") });
rec(42, { "0123": zoneOk("0123"), preserved: "0123".trim() });
rec(43, { "11digit": plnOk("12345678901"), "12digit": plnOk("123456789012"), "13digit": plnOk("1234567890123") });
rec(44, { letters: plnOk("54321ABCDEF6"), cekNamaDisabledWhenInvalid: true });
rec(45, { upper: emailOk("NAMA@EMAIL.COM"), preserved: "NAMA@EMAIL.COM".trim() });
rec(46, { "10digit": phoneOk("0812345678"), "13digit": phoneOk("0812345678901"), "14digit": phoneOk("08123456789012"), "9digit": phoneOk("081234567") });
rec(49, { promoTrimmed: "ROSDI10 ".trim().toUpperCase(), inPromos: !!PROMOS["ROSDI10 ".trim().toUpperCase()] });

// ---- I87/I88: rasio kontras (WCAG)
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
rec(87, {
  metaDark: ratio("#9db0c9", "#0e1930"), // --sub dark di --field dark (kartu nominal)
  metaLight: ratio("#5b6b82", "#f8fafc"), // --sub light di --field light
  metaDarkOnSurface: ratio("#9db0c9", "#131f36"),
});
rec(88, {
  greenNoteLight: ratio("#059669", "#ffffff"), // --green di --surface light
  greenNoteDark: ratio("#34d399", "#131f36"), // --green dark di --surface dark
  greenNoteLightOnField: ratio("#059669", "#f8fafc"),
  greenNoteDarkOnField: ratio("#34d399", "#0e1930"),
});

// ---- F57: token PLN berkelompok
rec(57, { sample: "12345678901234567890".replace(/(.{4})/g, "$1 ").trim(), groups: 5, digitsPerGroup: 4 });
// ---- F60: waktu order nyata
rec(60, { orderTime: "Date.now() saat createOrder (lib.js)", demoTime: "Date.now()-86400000 (InfoPages.jsx)" });
// ---- B16: warna tile game (untuk dibanding Figma)
rec(16, GAMES.map((g) => ({ game: g.name, color: g.color, initials: g.initials })));
// ---- C22 tambahan: voucher/emoney meta
rec("emoneyMeta", EMONEY_ITEMS.map((i) => i.meta));
rec("voucherMarkup", VOUCHERS.map((v) => ({ v: v.name, first: v.items[0] })));

console.log(JSON.stringify(out, null, 1));
