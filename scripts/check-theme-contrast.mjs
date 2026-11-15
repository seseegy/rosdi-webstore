// Pemeriksa kontras pasangan Light+Dark Rosdi Store (sudut audit 9: WHAT-IF MODE).
// Bukan bagian bundle — tidak diimpor App. Jalankan: node scripts/check-theme-contrast.mjs
// Aturan:
//  1. Setiap token warna hex di :root harus punya override di [data-theme="dark"],
//     kecuali token yang sengaja sama di kedua mode (SHARED).
//  2. Setiap pasangan teks/latar yang benar-benar dipakai di src/index.css dihitung
//     rasio kontras WCAG-nya di KEDUA mode. Ambang: 4.5 teks biasa, 3.0 teks UI
//     tebal/semibold & komponen (badge, tombol, ikon) — kelas yang sama dengan
//     pengecualian hallmark "putih di atas biru untuk teks tombol tebal".
//  3. Pasangan yang lolos di satu mode tapi gagal di mode satunya dicap MODE-DROP
//     (itulah yang dicari sudut 9: elemen yang hilang/kontras jatuh di mode lain).
//  4. Teks yang sengaja diredupkan (--faint: placeholder, ikon kaca pembesar,
//     copyright) dan tombol disabled hanya WARN, bukan FAIL — keduanya sudah
//     diputuskan sebagai teks non-esensial (QA #6 hanya menaikkan .p-fee/.was).
//  5. Rasio garis (--line) dan pemisah hero-vs-bg hanya INFO (paritas antar mode).
import { readFileSync } from "node:fs";

let fails = 0;
let warns = 0;
const fail = (msg) => { console.log("FAIL " + msg); fails++; };
const warn = (msg) => { console.log("WARN " + msg); warns++; };
const ok = (msg) => { console.log("OK   " + msg); };
const info = (msg) => { console.log("INFO " + msg); };

const css = readFileSync("src/index.css", "utf8");

function blockOf(selector) {
  const i = css.indexOf(selector);
  if (i < 0) return null;
  const open = css.indexOf("{", i);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}
function tokens(block) {
  const out = {};
  if (!block) return out;
  for (const m of block.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

const light = tokens(blockOf(":root"));
const dark = tokens(blockOf('[data-theme="dark"]'));
// Token yang sengaja identik di kedua mode (bukan warna tema): putih tombol,
// sub-teks hero di atas hero biru gelap (kedua mode), veil, dan non-warna.
const SHARED = new Set(["white", "hero-sub", "hero-btn-hover", "veil", "radius", "font", "ease"]);

// 1. Kelengkapan pasangan token.
for (const [name, hex] of Object.entries(light)) {
  if (SHARED.has(name)) { ok(`token --${name} sengaja sama di kedua mode (${hex})`); continue; }
  if (!(name in dark)) fail(`token --${name} (${hex}) tidak punya override dark`);
}
for (const name of Object.keys(dark)) {
  if (!(name in light)) fail(`token --${name} ada di dark tapi tidak ada di light`);
}
const missing = Object.keys(light).filter((n) => !SHARED.has(n) && !(n in dark));
if (missing.length === 0) ok("semua token warna light punya pasangan dark (atau tercatat SHARED)");

// 2. Kontras WCAG.
function lum(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (fg, bg) => {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};
const at = (theme, name) => (theme === "dark" && dark[name] ? dark[name] : light[name]);

// [fg, bg, ambang, label] — pasangan yang benar-benar dipakai di index.css.
const PAIRS = [
  // Teks biasa (4.5): body, nav, input, ringkasan.
  ["ink", "bg", 4.5, "teks body di latar halaman"],
  ["ink", "surface", 4.5, "teks body di kartu"],
  ["ink", "field", 4.5, "teks input di field"],
  ["sub", "bg", 4.5, "teks sekunder di latar halaman"],
  ["sub", "surface", 4.5, "teks sekunder di kartu"],
  ["sub", "field", 4.5, "teks sekunder di field"],
  ["blue-text", "surface", 4.5, "teks biru di kartu (harga, tautan, total)"],
  ["blue-text", "blue-soft", 4.5, "teks biru di pill biru (nav aktif, badge, trust)"],
  ["blue-text", "bg", 4.5, "teks biru di latar halaman (Lihat semua)"],
  ["blue-text", "field", 4.5, "teks biru di field (harga nominal, token PLN)"],
  ["hero-sub", "blue-deep", 4.5, "sub-teks hero di atas hero biru"],
  ["white", "blue-deep", 4.5, "judul hero putih di atas hero biru"],
  ["blue-deep", "white", 4.5, "teks tombol hero di atas tombol putih"],
  ["blue-deep", "hero-btn-hover", 4.5, "teks tombol hero saat hover"],
  // Teks UI tebal/semibold & komponen (3.0): tombol, chip, tab, badge, step.
  ["white", "blue", 3.0, "teks tombol utama putih di atas biru"],
  ["white", "blue-strong", 3.0, "teks putih di atas biru-kuat (hover tombol, chip/tab aktif, step-num)"],
  ["green", "surface", 3.0, "teks hijau semibold di kartu (note.good, diskon)"],
  ["green", "green-soft", 3.0, "teks hijau di latar hijau pucat (garansi, badge)"],
  ["red", "surface", 3.0, "teks merah semibold di kartu (note.bad, countdown)"],
  ["red", "red-soft", 3.0, "teks merah di latar merah pucat (badge)"],
  ["amber", "amber-soft", 3.0, "teks amber di latar amber pucat (status-tag)"],
];

for (const [fg, bg, min, label] of PAIRS) {
  const fgL = at("light", fg); const bgL = at("light", bg);
  const fgD = at("dark", fg); const bgD = at("dark", bg);
  if (!fgL || !bgL || !fgD || !bgD) {
    fail(`${label}: token --${!fgL || !fgD ? fg : bg} belum ada (diperlukan sebelum pasangan ini bisa dihitung)`);
    continue;
  }
  const rl = ratio(fgL, bgL);
  const rd = ratio(fgD, bgD);
  const tag = `${label}: light ${rl.toFixed(2)}:1 / dark ${rd.toFixed(2)}:1 (min ${min.toFixed(1)})`;
  const passL = rl >= min;
  const passD = rd >= min;
  if (passL && passD) ok(tag);
  else if (passL !== passD) fail(`MODE-DROP ${tag} — lolos di satu mode, gagal di mode satunya`);
  else fail(tag);
}

// 4. Teks non-esensial: hanya WARN (bukan FAIL).
for (const [fg, bg, label] of [
  ["faint", "surface", "placeholder/ikon/copyright di kartu"],
  ["faint", "bg", "teks redup di latar halaman"],
  ["faint", "surface-2", "teks tombol disabled di surface-2"],
]) {
  const rl = ratio(at("light", fg), at("light", bg));
  const rd = ratio(at("dark", fg), at("dark", bg));
  const tag = `${label}: light ${rl.toFixed(2)}:1 / dark ${rd.toFixed(2)}:1 (acuan 3.0)`;
  if (rl >= 3 && rd >= 3) ok(tag);
  else warn(`teks redup di bawah 3.0 — ${tag}`);
}

// 5. INFO paritas: garis & pemisah hero (bukan teks).
{
  const ll = ratio(at("light", "line"), at("light", "surface"));
  const ld = ratio(at("dark", "line"), at("dark", "surface"));
  info(`garis --line vs kartu: light ${ll.toFixed(2)}:1 / dark ${ld.toFixed(2)}:1 (border, bukan teks)`);
  const hl = ratio(at("light", "blue-deep"), at("light", "bg"));
  const hd = ratio(at("dark", "blue-deep"), at("dark", "bg"));
  info(`pemisah hero vs latar halaman: light ${hl.toFixed(2)}:1 / dark ${hd.toFixed(2)}:1`);
  if (hd < 3 && hl >= 3) warn("hero nyaris menyatu dengan latar di mode gelap (light menonjol, dark tidak)");
}

if (fails > 0) { console.log(`\n${fails} pemeriksaan GAGAL, ${warns} peringatan`); process.exit(1); }
console.log(`\nSemua pemeriksaan kontras tema LULUS (${warns} peringatan)`);
