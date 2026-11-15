// Audit data s435: ide J (91-100) + kontras E (41-50) + tile 92.
// Output JSON ringkas ke stdout.
import {
  GAMES, OPERATORS, DATA_PACKAGES, PLN_ITEMS, EMONEY_ITEMS, VOUCHERS,
  EWALLETS, BILLS, CATEGORY_COLORS, FLASH_SALE,
} from "../src/data.js";

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
};
const R = {};
// --- E: kontras token (Light/Dark) ---
const T = {
  light: { bg: "#f6f8fb", surface: "#ffffff", field: "#f8fafc", ink: "#0f172a", sub: "#5b6b82", faint: "#94a3b8", line: "#e2e8f0", blue: "#2563eb", blueText: "#2563eb", green: "#047857", red: "#dc2626", amber: "#b45309", amberSoft: "#fffbeb", greenSoft: "#ecfdf5", surface2: "#eef2f7" },
  dark: { bg: "#0b1220", surface: "#131f36", field: "#0e1930", ink: "#f1f5f9", sub: "#9db0c9", faint: "#64748b", line: "#22314f", blue: "#3b82f6", blueText: "#60a5fa", green: "#34d399", red: "#f87171", amber: "#fbbf24", amberSoft: "#2e230a", greenSoft: "#0c2b21", surface2: "#0e1930" },
};
R.contrast = {
  // 41 placeholder faint di atas field
  phLight: ratio(T.light.faint, T.light.field), phDark: ratio(T.dark.faint, T.dark.field),
  // 42 status-tag amber di atas amber-soft
  danamonLight: ratio(T.light.amber, T.light.amberSoft), danamonDark: ratio(T.dark.amber, T.dark.amberSoft),
  // 43 .p-fee sub di atas field (Light) / surface (Dark, baris .pay bg field)
  pfeeLight: ratio(T.light.sub, T.light.field), pfeeDark: ratio(T.dark.sub, T.dark.field),
  // 44 .was sub di atas surface
  wasLight: ratio(T.light.sub, T.light.surface), wasDark: ratio(T.dark.sub, T.dark.surface),
  // 45 count-chip red di atas surface
  countLight: ratio(T.light.red, T.light.surface), countDark: ratio(T.dark.red, T.dark.surface),
  // 46 .p-sub "Terjual 68%" sub di atas surface
  soldLight: ratio(T.light.sub, T.light.surface), soldDark: ratio(T.dark.sub, T.dark.surface),
  // 47 pay-chips sub di atas surface
  chipLight: ratio(T.light.sub, T.light.surface), chipDark: ratio(T.dark.sub, T.dark.surface),
  // 48 hint .note sub di atas surface
  hintLight: ratio(T.light.sub, T.light.surface), hintDark: ratio(T.dark.sub, T.dark.surface),
  // 49 teks timeline: ink di atas surface (teks status) + dot-only check di kode
  timelineLight: ratio(T.light.ink, T.light.surface), timelineDark: ratio(T.dark.ink, T.dark.surface),
  // 50 tombol Beli disabled: faint di atas surface-2
  buyDisLight: ratio(T.light.faint, T.light.surface2), buyDisDark: ratio(T.dark.faint, T.dark.surface2),
};
// --- 92: inisial putih di atas tile ---
const tiles = [];
for (const g of GAMES) tiles.push(["game:" + g.id, g.color]);
for (const o of OPERATORS) tiles.push(["op:" + o.id, o.color]);
for (const w of EWALLETS) tiles.push(["ew:" + w.id, w.color]);
for (const v of VOUCHERS) tiles.push(["vc:" + v.id, v.color]);
for (const b of BILLS) tiles.push(["bill:" + b.id, b.color]);
for (const [k, c] of Object.entries(CATEGORY_COLORS)) tiles.push(["cat:" + k, c]);
R.tiles92 = tiles.map(([n, c]) => ({ n, c, whiteOn: ratio("#ffffff", c) }));
// --- 91: from Roblox ---
R.roblox91 = { from: GAMES.find((g) => g.id === "roblox").from, min: Math.min(...GAMES.find((g) => g.id === "roblox").tabs.Robux.map((i) => i.price)) };
// --- 94: servers ---
R.servers94 = GAMES.filter((g) => g.servers).map((g) => g.id);
// --- 96: harga kembar dalam satu tab ---
const dupes = [];
const checkTab = (where, items) => {
  const seen = {};
  for (const it of items) {
    if (seen[it.price]) dupes.push({ where, price: it.price, a: seen[it.price], b: it.name });
    else seen[it.price] = it.name;
  }
};
for (const g of GAMES) for (const [t, items] of Object.entries(g.tabs)) checkTab(`game ${g.id}/${t}`, items);
for (const o of OPERATORS) { checkTab(`pulsa ${o.id}`, o.pulsa); if (o.transfer) checkTab(`transfer ${o.id}`, o.transfer); }
for (const [op, pkgs] of Object.entries(DATA_PACKAGES)) checkTab(`data ${op}`, pkgs);
checkTab("pln", PLN_ITEMS); checkTab("emoney", EMONEY_ITEMS);
for (const v of VOUCHERS) checkTab(`voucher ${v.id}`, v.items);
R.dupes96 = dupes;
// --- 97: redeem ---
R.redeem97 = VOUCHERS.map((v) => ({ id: v.id, len: (v.redeem || "").length }));
// --- 98: nama paket kembar antar operator ---
const pkgNames = {};
const pkgDupes = [];
for (const [op, pkgs] of Object.entries(DATA_PACKAGES)) {
  for (const p of pkgs) {
    if (pkgNames[p.name] && pkgNames[p.name] !== op) pkgDupes.push({ name: p.name, a: pkgNames[p.name], b: op });
    else pkgNames[p.name] = op;
  }
}
R.pkgDupes98 = pkgDupes;
// --- 100: harga ganjil (tidak berakhir 000/500) ---
const odd = [];
const collect = (where, items) => {
  for (const it of items || []) {
    if (it.price % 500 !== 0) odd.push({ where, name: it.name, price: it.price });
    if (it.was && it.was % 500 !== 0) odd.push({ where, name: it.name + " (was)", price: it.was });
  }
};
for (const g of GAMES) for (const [t, items] of Object.entries(g.tabs)) collect(`game ${g.id}/${t}`, items);
for (const o of OPERATORS) { collect(`pulsa ${o.id}`, o.pulsa); collect(`transfer ${o.id}`, o.transfer); }
for (const [op, pkgs] of Object.entries(DATA_PACKAGES)) collect(`data ${op}`, pkgs);
collect("pln", PLN_ITEMS); collect("emoney", EMONEY_ITEMS); collect("flash", FLASH_SALE);
for (const v of VOUCHERS) collect(`voucher ${v.id}`, v.items);
R.odd100 = odd;
R.odd100count = odd.length;
console.log(JSON.stringify(R, null, 1));
