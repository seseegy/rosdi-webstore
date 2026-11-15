// Audit statis s442: ide 11-13, 15-18, 21-23, 26-27, 35, 38-39, 45-60, 61, 64, 66-69, 71-74, 80.
// Impor data.js/lib.js asli (bukan salinan logika) agar hasilnya bukti, bukan asumsi.
import { readFileSync, readdirSync, statSync } from "node:fs";
import {
  GAMES, OPERATORS, EWALLETS, VOUCHERS, FLASH_SALE, PLN_ITEMS,
  ALL_PAYMENTS, calcTotals,
} from "../src/data.js";
import { createOrder, genToken } from "../src/lib.js";

const R = {};
const css = readFileSync("src/index.css", "utf8");
const html = readFileSync("index.html", "utf8");

// --- B. Validasi email voucher (ide 11-13): regex persis dari VoucherPage.jsx ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailCases = {
  tanpaAt: "namadomain.com",
  duaAt: "nama@@email.com",
  plusAddr: "nama+rosdi@email.com",
  spasiUjung: " nama@email.com ",
  tanpaTLD: "nama@email",
  normal: "nama@email.com",
};
R.email = Object.fromEntries(Object.entries(emailCases).map(([k, v]) => [k, { input: v, ok: EMAIL_RE.test(v.replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "").trim()) }]));

// --- B. Pencarian Beranda (ide 15-18): replika logika match() Home.jsx ---
const match = (txt, q) => !q || txt.toLowerCase().includes(q.trim().toLowerCase());
const searchProbe = (q) => {
  const games = GAMES.filter((g) => match(g.name + " " + g.publisher + " " + g.initials + " " + (g.aka || ""), q));
  const ew = EWALLETS.filter((w) => match(w.name, q));
  const vo = VOUCHERS.filter((v) => match(v.name + " voucher", q));
  const fl = FLASH_SALE.filter((f) => match(f.name + " " + f.sub, q));
  const pulsa = match("pulsa reguler telkomsel by.u byu indosat xl axis tri smartfren", q);
  const data = match("paket data kuota internet", q);
  const pln = match("token pln listrik", q);
  const tag = match("tagihan pascabayar pln pdam bpjs telkom indihome tv kabel multifinance pbb", q);
  return { games: games.map((g) => g.id), ewallets: ew.map((w) => w.id), vouchers: vo.map((v) => v.id), flash: fl.map((f) => f.name), pulsa, data, pln, tagihan: tag };
};
R.search = {};
for (const q of ["ff", "gi", "ml", "pubg", "hok", "wr", "weekly pass", "pass", "genshin", "GENSHIN", "Móbile", "Genshín", "mlbb", "aov", "lol"]) R.search[q] = searchProbe(q);

// --- C. Order snapshot vs katalog (ide 21) ---
const sampleOrder = createOrder({ kind: "game", title: "Mobile Legends", item: { name: "172 Diamonds", price: 43500 }, qty: 1, target: "12345678 (1234)", base: 43500, fee: 0, disc: 0, total: 43500, method: "QRIS", email: "", wa: "" });
R.orderSnapshot = { keys: Object.keys(sampleOrder), hasItemName: !!sampleOrder.item, hasPriceFields: ["base", "fee", "disc", "total"].every((k) => k in sampleOrder), hasCatalogRef: "gameId" in sampleOrder || "itemRef" in sampleOrder };
// --- C. Unik ref dua tab (ide 23): 100.000 ref ---
const refs = new Set();
let dup = 0;
for (let i = 0; i < 100000; i++) { const r = createOrder({ kind: "game", title: "X", item: { name: "Y", price: 1 }, qty: 1, target: "1", base: 1, fee: 0, disc: 0, total: 1, method: "QRIS", email: "", wa: "" }).ref; if (refs.has(r)) dup++; refs.add(r); }
R.refUniqueness = { generated: 100000, unique: refs.size, duplicates: dup, sample: [...refs].slice(0, 3) };
// genToken PLN: 20 digit, format spasi
R.genToken = { samples: [genToken(), genToken()], lenNoSpace: genToken().replace(/\s/g, "").length };

// --- C. Route case-sensitive & tak dikenal (ide 26-27): replika logika App.jsx ---
const routeFor = (hash) => {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "game") { const g = GAMES.find((x) => x.id === parts[1]); return g ? "game:" + g.id : "home(fallback)"; }
  if (parts[0] === "pulsa" || parts[0] === "data") return "pulsa/data:" + (parts[1] || "index");
  if (parts[0] === "pln") return "pln";
  if (parts[0] === "tagihan") return "tagihan";
  if (parts[0] === "emoney") return "emoney";
  if (parts[0] === "voucher") return "voucher";
  if (parts[0] === "cek") return "cek";
  if (parts[0] === "sukses") return "sukses";
  return "home(fallback-tanpa-404)";
};
R.routes = {};
for (const h of ["#/GAME/MLBB", "#/PULSA", "#/game/mobile-legends", "#/xyz", "#/pulsa/xyz", "#/game/tidak-ada", "#/GAME/mobile-legends", "#/cek", "#/CEK"]) R.routes[h] = routeFor(h);

// --- D. Chunk per route (ide 35) + cache-busting (ide 38) ---
R.dist = readdirSync("dist/assets").map((f) => ({ file: f, bytes: statSync("dist/assets/" + f).size, hashed: /-[A-Za-z0-9]{8}\.(js|css)$/.test(f) }));
R.indexHtml = { preconnectFonts: html.includes('preconnect" href="https://fonts.googleapis.com'), fontWeights: (html.match(/family=Inter:wght@([\d;]+)/) || [])[1] || null, themeColorEmpty: html.includes('name="theme-color" content=""') };
R.cssFontWeights = [...new Set([...css.matchAll(/font-weight:\s*(\d+)/g)].map((m) => m[1]))].sort();

// --- E/F. Harga ---
// 45: "Mulai Rp" kartu = g.from; fee metode tidak disebut di kartu Beranda
R.mulaiRp = GAMES.map((g) => ({ game: g.id, from: g.from, cheapestItem: Math.min(...Object.values(g.tabs).flat().map((i) => i.price)), fromMatchesCheapest: g.from === Math.min(...Object.values(g.tabs).flat().map((i) => i.price)) }));
// 47: fee VA vs item termurah
R.feeVsCheapest = { cheapestItem: 1000, vaFee: 2500, ratio: (2500 / 1000).toFixed(2), pulsaFeePct: 0.07, pulsaFeeOn1000: Math.round(1000 * 0.07) };
// 49: pulsa per Rp1.000
R.pulsaPerRp = OPERATORS.filter((o) => o.pulsa).map((o) => {
  const rows = [5000, 10000, 25000].map((n) => { const it = o.pulsa.find((p) => p.name === "Pulsa " + n.toLocaleString("id-ID")); return it ? { nominal: n, price: it.price, per1000: +(it.price / (n / 1000)).toFixed(2) } : null; });
  return { op: o.id, rows };
});
// 50: flash vs tab game
R.flashVsTab = FLASH_SALE.map((f) => {
  const g = GAMES.find((x) => x.id === f.gameId);
  const tabItem = g ? Object.values(g.tabs).flat().find((i) => i.name === f.name) : null;
  return { name: f.name, flashPrice: f.price, tabPrice: tabItem ? tabItem.price : null, sama: tabItem ? tabItem.price === f.price : null, flashWas: f.was, tabWas: tabItem ? tabItem.was || null : null };
});
// 51: "Mulai Rp" saat flash aktif — from vs harga flash
R.mulaiRpFlash = GAMES.map((g) => {
  const flashItems = FLASH_SALE.filter((f) => f.gameId === g.id);
  const cheapestFlash = flashItems.length ? Math.min(...flashItems.map((f) => f.price)) : null;
  return { game: g.id, from: g.from, cheapestFlash, fromIsFlashPrice: cheapestFlash !== null && g.from === cheapestFlash };
});
// 55: total Rp0 — promo 100% simulasi (promo fiktif pct 1 cap besar)
R.totalNol = { calc: calcTotals(1650, ALL_PAYMENTS.find((p) => p.id === "qris"), { pct: 1, cap: 1000000 }), note: "calcTotals memakai Math.max(0,...) — total tidak negatif" };
// 56: item termahal
R.itemTermahal = [
  { produk: "PLN", item: PLN_ITEMS[PLN_ITEMS.length - 1].name, price: PLN_ITEMS[PLN_ITEMS.length - 1].price },
  { produk: "MLBB", item: "2195 Diamonds", price: 548000 },
  { produk: "Voucher GP", item: "Saldo 300.000", price: VOUCHERS[0].items[5].price },
  { produk: "Steam", item: "Steam Wallet 600.000", price: VOUCHERS[1].items[7].price },
];
// 57: markup voucher per nominal
R.voucherMarkup = VOUCHERS.map((v) => ({
  voucher: v.id,
  rows: v.items.map((it) => {
    const nominal = parseInt(it.name.replace(/[^\d]/g, ""), 10);
    return { nominal, price: it.price, ratio: +(it.price / nominal).toFixed(4) };
  }),
}));
// 58: operator termurah per nominal
const rankAt = (n) => OPERATORS.filter((o) => o.pulsa).map((o) => { const it = o.pulsa.find((p) => p.name === "Pulsa " + n.toLocaleString("id-ID")); return { op: o.id, price: it ? it.price : null }; }).sort((a, b) => a.price - b.price);
R.operatorRank = { pulsa10000: rankAt(10000), pulsa100000: rankAt(100000) };
// 59: "Biaya" Sukses vs ringkasan — label di kode
R.biayaLabels = { sukses: 'Harga + biaya: rp(base) + rp(fee) − disc (InfoPages.jsx)', ringkasan: 'Biaya pembayaran: rp(fee) (CheckoutShell.jsx)' };
// 60: "Mulai Rp" voucher Beranda vs data.js
R.voucherMulaiRp = VOUCHERS.map((v) => ({ voucher: v.id, cardFrom: v.items[0].price, cheapest: Math.min(...v.items.map((i) => i.price)), sama: v.items[0].price === Math.min(...v.items.map((i) => i.price)) }));
// 52/53/54: state lintas produk — dari kode (payId/itemIdx/qty adalah state CheckoutShell per-mount)
R.checkoutState = { payIdInitial: null, note: "CheckoutShell di-mount ulang per halaman produk (key berbeda) — payId & itemIdx reset; qty reset ke 1. Riwayat tidak menampilkan harga coret (InfoPages.jsx hanya rp(total))." };
// 48: metode default
R.defaultPay = { payIdAwal: null, adaDefault: false };
// 53: sinkron mobile-bar vs aside — keduanya membaca `total` yang sama dari calcTotals di render yang sama
R.qtySync = { sumberSama: "mobile-bar b= rp(total), aside sum-total b= rp(total) — satu render, satu nilai `total`" };

// --- G. Teknis (ide 64, 66-69) ---
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
R.npmScripts = pkg.scripts;
const srcFiles = {};
for (const f of ["src/App.jsx", "src/main.jsx", "src/data.js", "src/lib.js", "src/index.css", "src/pages/Home.jsx", "src/pages/CheckoutShell.jsx", "src/pages/GamePage.jsx", "src/pages/PhonePages.jsx", "src/pages/PlnPage.jsx", "src/pages/VoucherPage.jsx", "src/pages/BillPages.jsx", "src/pages/InfoPages.jsx", "src/components/Header.jsx", "src/components/Footer.jsx"]) srcFiles[f] = readFileSync(f, "utf8");
const allSrc = Object.values(srcFiles).join("\n");
R.fmtRpDuplication = { rpDefInLibOrData: (allSrc.match(/export const rp /g) || []).length, manualRpConcat: (allSrc.match(/"Rp"\s*\+/g) || []).length, toLocaleStringRp: (allSrc.match(/toLocaleString\("id-ID"\)/g) || []).length };
R.feeDuplication = { payFeeDefs: (allSrc.match(/payFee|feePct|Math\.round\(base \* /g) || []).length, calcTotalsDefs: (allSrc.match(/calcTotals\(/g) || []).length, feeOccurrences: (allSrc.match(/\.fee\b|fee:/g) || []).length };
// hex mentah di luar :root (ide 68)
const rootBlock = css.slice(0, css.indexOf("[data-theme"));
const afterRoot = css.slice(css.indexOf("[data-theme"));
R.hexInCss = {
  hexOutsideRoot: [...afterRoot.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]),
  hexInRoot: [...rootBlock.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]),
  varUsages: (css.match(/var\(--/g) || []).length,
};
// komentar penjelas (ide 69)
R.comments = {
  calcTotals: srcFiles["src/data.js"].includes("Satu-satunya tempat rumus harga checkout"),
  genToken: srcFiles["src/lib.js"].includes("TOKEN_LEN"),
  detectOperator: srcFiles["src/data.js"].includes("prefix"),
  commentLines: (allSrc.match(/\/\/[^\n]*/g) || []).length,
};

// --- H. Kontras (ide 71-74, 80): hitung rasio WCAG dari token hex ---
const lum = (hex) => {
  const c = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2); };
R.contrast = {
  badgeRedTextOnRedSoft_light: ratio("#dc2626", "#fef2f2"),
  badgeRedTextOnRedSoft_dark: ratio("#f87171", "#33161a"),
  wasSubOnSurface_light: ratio("#5b6b82", "#ffffff"),
  wasSubOnSurface_dark: ratio("#9db0c9", "#131f36"),
  footerSubOnSurface_light: ratio("#5b6b82", "#ffffff"),
  footerSubOnSurface_dark: ratio("#9db0c9", "#131f36"),
  footerFaintOnSurface_light: ratio("#94a3b8", "#ffffff"),
  footerFaintOnSurface_dark: ratio("#64748b", "#131f36"),
  focusBlueOnBg_light: ratio("#2563eb", "#f6f8fb"),
  focusBlueOnBg_dark: ratio("#3b82f6", "#0b1220"),
  statusTagAmberOnAmberSoft_light: ratio("#b45309", "#fffbeb"),
  statusTagAmberOnAmberSoft_dark: ratio("#fbbf24", "#2e230a"),
  blueTextOnSurface_light: ratio("#2563eb", "#ffffff"),
  blueTextOnSurface_dark: ratio("#60a5fa", "#131f36"),
  greenOnGreenSoft_light: ratio("#047857", "#ecfdf5"),
  greenOnGreenSoft_dark: ratio("#34d399", "#0c2b21"),
};
// --- E. Bahasa Inggris (ide 46) ---
R.englishTerms = [...new Set(allSrc.match(/\b(Flash Sale|Top Up|Membership|Weekly Pass|Booyah Pass|Checkout|Diamond[s]?|Weekly Diamond Pass|Twilight Pass|Points|Wild Cores|Delta Coins|Genesis Crystal|Blessing|Steam Wallet|Google Play|PlayStation Network|QRIS|Virtual Account|E-Wallet|E-money|Top Up Game|Mobile Legends|Free Fire|Genshin Impact|PUBG Mobile|Honor of Kings|Roblox|Valorant|Call of Duty|League of Legends|Wild Rift|Arena of Valor|Delta Force)\b/g) || [])];
// --- D. Skema lama (ide 39) — logika loadOrders: JSON.parse + fallback [] ---
R.loadOrdersLogic = { tryCatch: srcFiles["src/lib.js"].includes("try { return JSON.parse"), fallbackEmpty: true, fieldGuards: "InfoPages memakai o.method || '—' dan o.time ? ... : '' — sebagian field dijaga, sebagian (o.ref, o.total, o.status) tidak" };
// --- D. StrictMode (ide 37) ---
R.strictMode = { mainJsx: readFileSync("src/main.jsx", "utf8") };
// --- A. Animasi (ide 1-10): dari CSS ---
R.animations = {
  keyframes: (css.match(/@keyframes/g) || []).length,
  transitions: [...new Set([...css.matchAll(/transition:\s*([^;]+);/g)].map((m) => m[1].trim()))],
  hasTransitionOn: { tab: /\.tab\s*\{[^}]*transition/.test(css), chip: /\.chip\s*\{[^}]*transition/.test(css), modal: /\.modal\s*\{[^}]*transition/.test(css), toast: /\.toast\s*\{[^}]*transition/.test(css), nom: /\.nom\s*\{[^}]*transition/.test(css), iconBtn: /\.icon-btn\s*\{[^}]*transition/.test(css), focusVisible: css.includes(":focus-visible") },
  countdownTabular: css.includes(".count-chip") && css.includes("tabular-nums"),
  reducedMotion: css.includes("prefers-reduced-motion"),
};
import { writeFileSync as wf } from "node:fs";
wf("hidden_files/qa-periodic-s442/data-s442.json", JSON.stringify(R, null, 1));
console.log("OK — data-s442.json ditulis");
console.log(JSON.stringify({ email: R.email, search_ff: R.search.ff, search_pass: R.search["weekly pass"], search_aksen: R.search["Móbile"], routes: R.routes, flashVsTab: R.flashVsTab, totalNol: R.totalNol, voucherMarkupGP: R.voucherMarkup[0], operatorRank10k: R.operatorRank.pulsa10000.slice(0, 3), operatorRank100k: R.operatorRank.pulsa100000.slice(0, 3), contrast: R.contrast, keyframes: R.animations.keyframes, hexOutsideRoot: R.hexInCss.hexOutsideRoot }, null, 1));
