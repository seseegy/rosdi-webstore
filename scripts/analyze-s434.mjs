// Analisis statis batch s434 — data.js, CSS, repo hygiene (ide 41-60, 81-100).
// Read-only. Output JSON ke stdout.
import { readFileSync, readdirSync, statSync } from "node:fs";
import {
  GAMES, OPERATORS, DATA_PACKAGES, PLN_ITEMS, EMONEY_ITEMS, EWALLETS,
  FLASH_SALE, VOUCHERS, PAYMENTS, ALL_PAYMENTS,
  PROMOS, calcTotals, maskName, RIOT_ID_RE,
} from "../src/data.js";

const out = {};
const css = readFileSync("src/index.css", "utf-8");

// --- 41: daftar 13 metode (ALL_PAYMENTS harus 13) ---
out.pay41 = { count: ALL_PAYMENTS.length, list: ALL_PAYMENTS.map((p) => ({ id: p.id, name: p.name, group: p.group, fee: p.fee ?? null, feePct: p.feePct ?? null, status: p.status || null })) };
// --- 42: grup metode ---
out.pay42 = { groups: PAYMENTS.map((g) => g.group), counts: PAYMENTS.map((g) => g.items.length) };
// --- 43: mark tiap metode ---
out.pay43 = { marks: ALL_PAYMENTS.map((p) => p.id + "=" + (p.mark || "-")) };
// --- 44: pulsa bayar pulsa (tidak ada peringatan di data; cek di kode nanti) ---
out.pay44 = { pulsaMethods: ALL_PAYMENTS.filter((p) => p.id.startsWith("pulsa-")).map((p) => p.id) };
// --- 45: status gangguan ---
out.pay45 = { withStatus: ALL_PAYMENTS.filter((p) => p.status).map((p) => p.id + ":" + p.status) };
// --- 46: retail fee ---
out.pay46 = { alfamart: ALL_PAYMENTS.find((p) => p.id === "alfamart"), indomaret: ALL_PAYMENTS.find((p) => p.id === "indomaret") };
// --- 47: VA fee ---
out.pay47 = { va: ["bca", "mandiri", "bri", "danamon"].map((id) => { const p = ALL_PAYMENTS.find((x) => x.id === id); return { id, name: p.name, fee: p.fee, status: p.status || null }; }) };
// --- 48: desc QRIS ---
out.pay48 = { qris: ALL_PAYMENTS.find((p) => p.id === "qris") };
// --- 49: harga metode x promo ROSDI10 untuk base 43500 ---
out.pay49 = {};
for (const base of [43500]) {
  out.pay49[base] = ALL_PAYMENTS.map((p) => ({ id: p.id, ...calcTotals(base, p, { ...PROMOS.ROSDI10, code: "ROSDI10" }) }));
}
// --- 50: default payId di CheckoutShell = null (cek via grep, di sini catat) ---
out.pay50 = { note: "payId useState(null) di CheckoutShell.jsx:17 — tidak ada default; diverifikasi runtime via CDP" };

// --- 51: pulsa 10.000 per operator ---
out.p51 = OPERATORS.map((o) => ({ id: o.id, p10000: o.pulsa.find((i) => i.name === "Pulsa 10.000")?.price ?? null, n: o.pulsa.length }));
// --- 52: jumlah nominal ---
out.p52 = OPERATORS.map((o) => ({ id: o.id, pulsa: o.pulsa.length, transfer: o.transfer ? o.transfer.length : 0 }));
// --- 53: rute data per operator (App.jsx: parts[0]==='data' -> PhonePage mode data) ---
out.p53 = { note: "rute #/data/:op ada (App.jsx), bukan halaman khusus per operator; DATA_PACKAGES keys: " + Object.keys(DATA_PACKAGES).join(",") };
// --- 54: GB vs MB di DATA_PACKAGES ---
const gbmb = [];
for (const [op, pkgs] of Object.entries(DATA_PACKAGES)) for (const p of pkgs) gbmb.push(op + "::" + p.name + " || " + p.meta);
out.p54 = { mbMentions: gbmb.filter((s) => /\bMB\b/.test(s)), gbCount: gbmb.filter((s) => /\bGB\b/.test(s)).length, total: gbmb.length };
// --- 55: maskName beberapa ID ---
out.p55 = { masks: ["12345678901", "123456789012", "543210987654", "11111111111", "999999999999"].map((id) => id + " -> " + maskName(id)) };
// --- 56: tarif PLN (hash-based, 4 tarif) ---
out.p56 = { tarifs: ["R1 / 900 VA", "R1 / 1300 VA", "R2 / 2200 VA", "R1M / 900 VA"], sample: ["12345678901", "123456789012", "543210987654"].map((id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997; return id + " -> tarif#" + (h % 4); }) };
// --- 57: e-wallet harga sama? EMONEY_ITEMS dipakai semua wallet ---
out.p57 = { emoneyItems: EMONEY_ITEMS.map((i) => i.name + "=" + i.price), note: "satu daftar dipakai ke-4 wallet (PhonePages: items=EMONEY_ITEMS)" };
// --- 58: admin e-wallet ---
out.p58 = { metas: [...new Set(EMONEY_ITEMS.map((i) => i.meta))] };
// --- 59: denominasi voucher ---
out.p59 = VOUCHERS.map((v) => ({ id: v.id, n: v.items.length, min: v.items[0], max: v.items[v.items.length - 1] }));
// --- 60: frame voucher (cek daftar frame di hasil Figma; di sini data saja) ---
out.p60 = { vouchers: VOUCHERS.map((v) => v.id) };

// --- 61: Riot ID validation ---
out.g61 = { tests: ["PlayerOne#TAG12", "AB#TAG", "Nama#12", "TanpaTag", "Nama#TAG123456", "A#B", "Nama Kamu#ABC"].map((s) => s + " -> " + RIOT_ID_RE.test(s)) };
// --- 62: WR & AoV riotId? ---
out.g62 = GAMES.filter((g) => ["wild-rift", "arena-of-valor"].includes(g.id)).map((g) => ({ id: g.id, riotId: !!g.riotId, needsZone: g.needsZone }));
// --- 63: HoK singkatan ---
out.g63 = { hok: GAMES.find((g) => g.id === "honor-of-kings"), akaInCode: GAMES.map((g) => g.id + ":" + (g.aka || "-")) };
// --- 64: Robux ---
out.g64 = GAMES.find((g) => g.id === "roblox").tabs;
// --- 65: FF Membership urutan harga ---
out.g65 = GAMES.find((g) => g.id === "free-fire").tabs["Membership"].map((i) => i.name + "=" + i.price);
// --- 66: tumpang tindih harga antar tab ---
out.g66 = GAMES.map((g) => {
  const tabs = Object.entries(g.tabs);
  return { id: g.id, tabs: tabs.map(([t, items]) => t + ": " + Math.min(...items.map((i) => i.price)) + "–" + Math.max(...items.map((i) => i.price))) };
});
// --- 67: jumlah tab per game ---
out.g67 = GAMES.map((g) => ({ id: g.id, nTabs: Object.keys(g.tabs).length, tabs: Object.keys(g.tabs) }));
// --- 68: item tanpa meta ---
out.g68 = GAMES.flatMap((g) => Object.entries(g.tabs).flatMap(([t, items]) => items.filter((i) => !i.meta).map((i) => g.id + "/" + t + "/" + i.name)));
// --- 69: crumb publisher ---
out.g69 = GAMES.map((g) => g.id + ": " + g.publisher);
// --- 70: warna tile game ---
out.g70 = GAMES.map((g) => g.id + ": " + g.color + " " + g.initials);

// --- 71-75: calcTotals per base desktop ---
out.h71_75 = {};
for (const [label, base] of [["MLBB-43500", 43500], ["Pulsa-51907", 51907], ["PLN-102500", 102500], ["DANA-99942", 99942], ["Voucher-55000", 55000]]) {
  out.h71_75[label] = ALL_PAYMENTS.map((p) => ({ id: p.id, fee: calcTotals(base, p, null).fee, total: calcTotals(base, p, null).total }));
}

// --- 81: hex di luar :root ---
const rootBlock = css.match(/:root\s*\{[\s\S]*?\n\}/);
const afterRoot = css.slice(rootBlock ? rootBlock.index + rootBlock[0].length : 0);
const darkBlock = afterRoot.match(/\[data-theme="dark"\]\s*\{[\s\S]*?\n\}/);
const rest = darkBlock ? afterRoot.replace(darkBlock[0], "") : afterRoot;
out.css81 = { hexOutsideTokens: [...rest.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]), rgbOutside: [...rest.matchAll(/rgba?\([^)]*\)/g)].map((m) => m[0]) };
// --- 82: style={{}} warna hex di JSX ---
import { execSync } from "node:child_process";
const jsxHex = execSync("grep -rn --include='*.jsx' -E 'style=\\{\\{[^}]*#[0-9a-fA-F]' src/ || true", { encoding: "utf-8" });
out.css82 = { jsxStyleHex: jsxHex.trim().split("\n").filter(Boolean) };
// --- 83: border-radius ---
out.css83 = { radius: [...new Set([...css.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim()))] };
// --- 84: box-shadow ---
out.css84 = { shadows: [...new Set([...css.matchAll(/box-shadow:\s*([^;]+);/g)].map((m) => m[1].trim()))], shadowVarUses: (css.match(/var\(--shadow\)/g) || []).length };
// --- 85: padding kartu & gap grid ---
out.css85 = { cardPaddings: [...new Set([...css.matchAll(/\.card[^{]*\{[^}]*padding:\s*([^;]+);/g)].map((m) => m[1].trim()))], stepPadding: [...css.matchAll(/\.step\s*\{[^}]*padding:\s*([^;]+);/g)].map((m) => m[1]), gridGaps: [...new Set([...css.matchAll(/\.grid[^{]*\{[^}]*gap:\s*([^;]+);/g)].map((m) => m[1].trim()))], trustGap: [...css.matchAll(/\.trust\s*\{[^}]*gap:\s*([^;]+);/g)].map((m) => m[1]) };
// --- 86: font-size ---
out.css86 = { fontSizes: [...new Set([...css.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1].trim()))].sort((a, b) => parseFloat(a) - parseFloat(b)) };
// --- 87: font-weight ---
out.css87 = { fontWeights: [...new Set([...css.matchAll(/font-weight:\s*([^;]+);/g)].map((m) => m[1].trim()))] };
// --- 88: z-index ---
out.css88 = { zIndex: [...css.matchAll(/z-index:\s*([^;]+);/g)].map((m) => m[1].trim()), contexts: [...css.matchAll(/([.#][\w-]+)\s*\{[^}]*z-index:\s*([^;]+);/g)].map((m) => m[1] + "=" + m[2]) };
// --- 89: transition ---
out.css89 = { transitions: [...new Set([...css.matchAll(/transition:\s*([^;]+);/g)].map((m) => m[1].trim()))] };
// --- 90: @media print ---
out.css90 = { hasPrint: /@media print/.test(css) };

// --- 91: kelengkapan field game ---
out.j91 = GAMES.map((g) => ({ id: g.id, fields: ["id", "name", "publisher", "initials", "color", "tagline", "from", "tabs"].map((f) => f + ":" + (g[f] !== undefined)).join(" "), needsZone: g.needsZone, riotId: !!g.riotId, servers: !!g.servers, aka: g.aka || "-" }));
// --- 92: struktur OPERATORS vs EMONEY vs VOUCHERS ---
out.j92 = {
  operatorFields: [...new Set(OPERATORS.flatMap((o) => Object.keys(o)))],
  ewalletFields: [...new Set(EWALLETS.flatMap((w) => Object.keys(w)))],
  voucherFields: [...new Set(VOUCHERS.flatMap((v) => Object.keys(v)))],
  emoneyItemFields: [...new Set(EMONEY_ITEMS.flatMap((i) => Object.keys(i)))],
  plnItemFields: [...new Set(PLN_ITEMS.flatMap((i) => Object.keys(i)))],
};
// --- 93: metode mati (cek pemakaian PAYMENTS di CheckoutShell: semua grup dirender) ---
out.j93 = { note: "CheckoutShell merender PAYMENTS.map semua grup; ALL_PAYMENTS dipakai untuk pay lookup. Tidak ada metode yang tidak dirender." };
// --- 94: promo ---
out.j94 = { promos: Object.entries(PROMOS).map(([k, v]) => k + ": " + v.desc), usedInUI: "applyPromo di CheckoutShell; placeholder menyebut ROSDI10; GAMER5 tidak disebut di UI (hanya ROSDI10 di placeholder/pesan error)" };
// --- 95: duplikasi flash vs katalog ---
out.j95 = {
  flash: FLASH_SALE.map((f) => ({ name: f.name, price: f.price, was: f.was })),
  catalogMatch: FLASH_SALE.map((f) => {
    const g = GAMES.find((x) => x.id === f.gameId);
    const cat = Object.values(g.tabs).flat().find((i) => i.name === f.name);
    return f.name + " katalog: " + (cat ? `price=${cat.price} was=${cat.was} badge=${cat.badge}` : "TIDAK ADA") + " | flash: price=" + f.price + " was=" + f.was;
  }),
};
// --- 96: ukuran dist ---
let total = 0; const files = [];
const walk = (d) => { for (const e of readdirSync(d)) { const p = d + "/" + e; const s = statSync(p); if (s.isDirectory()) walk(p); else { total += s.size; files.push([p, s.size]); } } };
walk("dist");
out.j96 = { totalBytes: total, files: files.sort((a, b) => b[1] - a[1]) };
// --- 97: sourcemap ---
out.j97 = { maps: files.filter(([p]) => p.endsWith(".map")).map(([p]) => p) };
// --- 98: dependensi ---
const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
out.j98 = { deps: Object.keys(pkg.dependencies), devDeps: Object.keys(pkg.devDependencies) };
// --- 99: git? ---
let git = "bukan repo git";
try { git = execSync("git -C . status --short --branch 2>&1 | head -20", { encoding: "utf-8" }).trim() || "repo git bersih?"; } catch { git = "git gagal / bukan repo"; }
out.j99 = { git };
// --- 100: nama file scripts ---
const scripts = readdirSync("scripts");
out.j100 = { count: scripts.length, nonConforming: scripts.filter((f) => !/^(check-|figma-|cdp-|make-|analyze-)/.test(f)) };

console.log(JSON.stringify(out, null, 1));
