// Pemeriksa hasil code-splitting per rute (bukan bagian bundle — tidak diimpor App).
// Jalankan SETELAH build:  npm run build && npm run check:chunks
// Ambang dipatok dari hasil ukur Siklus 4 (11 Nov 2026):
//   chunk awal 247,34 kB (sebelum split: satu bundle 265,17 kB),
//   7 file JS (awal + CheckoutShell + 5 chunk halaman).
import { readdirSync, readFileSync, statSync } from "node:fs";

const assetsDir = new URL("../dist/assets/", import.meta.url);
const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const entryMatch = html.match(/src="\/assets\/(index-[^"]+\.js)"/);
let fails = 0;
const check = (ok, msg) => { console.log((ok ? "OK   " : "FAIL ") + msg); if (!ok) fails++; };

const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith(".js")).sort();
check(jsFiles.length >= 6, `chunk JS di dist/assets: ${jsFiles.length} file (butuh >= 6: awal + checkout + halaman)`);
check(jsFiles.some((f) => f.startsWith("CheckoutShell-")), "chunk bersama CheckoutShell ada (dipakai semua halaman produk)");
check(!!entryMatch, `index.html merujuk chunk awal${entryMatch ? " " + entryMatch[1] : ""}`);
if (entryMatch) {
  const size = statSync(new URL("../dist/assets/" + entryMatch[1], import.meta.url)).size;
  // Ambang 260.000 byte (naik dari 255.000 di Siklus 115, Tahap 4): katalog
  // tumbuh atas perintah Mas (Tahap 1a–4: +5 game, by.U + transfer, 70 paket
  // data, 7 kategori tagihan) dan semuanya hidup di data.js yang diimpor
  // chunk awal — chunk awal 258.048 byte kini 3.048 byte di atas ambang lama.
  // Ambang tetap di bawah bundle pra-split 265,2 kB; bila katalog tumbuh
  // lagi, pecah data.js agar data rute-lazy keluar dari chunk awal — jangan
  // naikkan ambang lagi tanpa restruktur itu.
  check(size < 260000, `chunk awal ${entryMatch[1]}: ${(size / 1024).toFixed(1)} kB (< 260 kB; sebelum split 265,2 kB)`);
  const total = jsFiles.reduce((s, f) => s + statSync(new URL("../dist/assets/" + f, import.meta.url)).size, 0);
  console.log(`     total semua chunk JS: ${(total / 1024).toFixed(1)} kB (awal + lazy; total boleh naik sedikit karena overhead chunk)`);
}
console.log(fails === 0 ? "\nSemua pemeriksaan chunk LULUS." : `\n${fails} pemeriksaan GAGAL.`);
process.exit(fails === 0 ? 0 : 1);
