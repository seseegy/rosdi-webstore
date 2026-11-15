// Pemeriksa aturan warna Rosdi Store (bukan bagian bundle — tidak diimpor App).
// Jalankan: node scripts/check-tokens.mjs
// Aturan: semua warna tema hidup di token CSS (src/index.css, baris `--nama:`);
// warna tile/brand hidup di src/data-core.js + src/data-catalog.js (field
// `color:` tiap entri katalog + CATEGORY_COLORS). File .jsx dan index.html
// apa pun — kalau ada, perbaikan yang benar adalah pindah ke token/data.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CATEGORY_COLORS } from "../src/data.js";

let fails = 0;
const check = (ok, msg) => {
  console.log((ok ? "OK   " : "FAIL ") + msg);
  if (!ok) fails++;
};

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNC_COLOR = /\b(?:rgba?|hsla?)\s*\(/g;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".jsx") || e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

// 1. .jsx/.js di src (kecuali data-core.js/data-catalog.js, rumah warna
// brand): nol literal warna.
for (const f of walk("src")) {
  if (f.endsWith("src/data-core.js") || f.endsWith("src/data-catalog.js")) continue;
  const lines = readFileSync(f, "utf8").split("\n");
  let bad = 0;
  lines.forEach((line, i) => {
    const hex = line.match(HEX);
    if (hex) { bad++; check(false, `${f}:${i + 1}: literal hex di luar data-core/data-catalog/token: ${hex.join(", ")}`); }
    const fn = line.match(FUNC_COLOR);
    if (fn) { bad++; check(false, `${f}:${i + 1}: literal warna fungsional di luar token: ${fn.join(", ")}`); }
  });
  check(bad === 0, `${f}: tanpa literal warna`);
}

// 2. index.html: nol literal warna.
{
  const lines = readFileSync("index.html", "utf8").split("\n");
  let bad = 0;
  lines.forEach((line, i) => {
    if (line.match(HEX) || line.match(FUNC_COLOR)) { bad++; check(false, `index.html:${i + 1}: literal warna`); }
  });
  check(bad === 0, "index.html: tanpa literal warna");
}

// 3. index.css: hex/rgb hanya di baris definisi token (`--nama: ...`).
{
  const lines = readFileSync("src/index.css", "utf8").split("\n");
  let bad = 0;
  lines.forEach((line, i) => {
    if ((line.match(HEX) || line.match(FUNC_COLOR)) && !/^\s*--[\w-]+\s*:/.test(line)) {
      bad++;
      check(false, `src/index.css:${i + 1}: warna di luar definisi token: ${line.trim()}`);
    }
  });
  check(bad === 0, "src/index.css: semua warna di baris definisi token");
}

// 4. data-core.js + data-catalog.js: hex hanya di field `color:` atau di
// dalam CATEGORY_COLORS, dan CATEGORY_COLORS berisi tepat empat kategori
// dengan hex 6 digit.
for (const df of ["src/data-core.js", "src/data-catalog.js"]) {
  const lines = readFileSync(df, "utf8").split("\n");
  let inCat = false;
  let bad = 0;
  lines.forEach((line, i) => {
    if (/export const CATEGORY_COLORS/.test(line)) inCat = true;
    const hex = line.match(HEX);
    if (hex && !/color\s*:/.test(line) && !inCat) {
      bad++;
      check(false, `${df}:${i + 1}: hex di luar field color:/CATEGORY_COLORS: ${hex.join(", ")}`);
    }
    if (inCat && /\};/.test(line)) inCat = false;
  });
  check(bad === 0, `${df}: semua hex di field color: atau CATEGORY_COLORS`);
}
{
  const keys = Object.keys(CATEGORY_COLORS).sort().join(",");
  check(keys === "data,pln,pulsa,tagihan", `CATEGORY_COLORS: kunci tepat data,pln,pulsa,tagihan (dapat: ${keys})`);
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    check(/^#[0-9a-f]{6}$/.test(v), `CATEGORY_COLORS.${k}: hex 6 digit (${v})`);
  }
}

if (fails > 0) { console.log(`\n${fails} pemeriksaan GAGAL`); process.exit(1); }
console.log("\nSemua pemeriksaan warna LULUS");
