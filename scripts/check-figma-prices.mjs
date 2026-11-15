// Pemeriksa QA: bandingkan semua angka "Rp" di file Figma (dump dari
// scripts/figma-qa-scan.js) dengan harga sah dari src/data.js.
// Harga sah = harga item katalog + `from` + `was` + harga metode
// (calcTotals tanpa promo untuk tiap harga item x tiap metode) + fee.
// Pemakaian: node scripts/check-figma-prices.mjs /tmp/qa-scan18.json
import { readFileSync } from "node:fs";
import {
  GAMES, OPERATORS, DATA_PACKAGES, PLN_ITEMS, EMONEY_ITEMS,
  FLASH_SALE, VOUCHERS, ALL_PAYMENTS, payFee, calcTotals,
  BILLS, BILL_ADMIN, billItem,
} from "../src/data.js";

const scanPath = process.argv[2] || "/tmp/qa-scan18.json";
const raw = JSON.parse(readFileSync(scanPath, "utf-8"));
const inner = JSON.parse(raw.result.content[0].text);

// --- Kumpulkan harga sah ---
const legit = new Set();
const froms = new Set();
const add = (n) => { if (typeof n === "number" && n >= 0) legit.add(Math.round(n)); };

const bases = new Set();
const collectItems = (items) => {
  for (const it of items || []) {
    add(it.price); add(it.was); add(it.tokenValue);
    if (it.price) bases.add(it.price);
  }
};
for (const g of GAMES) {
  froms.add(g.from); add(g.from);
  for (const tab of Object.values(g.tabs || {})) collectItems(tab);
}
for (const op of OPERATORS) { collectItems(op.pulsa); collectItems(op.transfer); }
for (const pkgs of Object.values(DATA_PACKAGES)) collectItems(pkgs);
collectItems(PLN_ITEMS);
collectItems(EMONEY_ITEMS);
collectItems(FLASH_SALE);
// Pascabayar (Tahap 4): tagihan contoh + harga item (tagihan + admin) ikut
// sah — frame Tahap 5 menampilkan keduanya di rincian tagihan.
for (const b of BILLS) {
  add(b.bill.amount);
  const it = billItem(b);
  add(it.price);
  if (it.price) bases.add(it.price);
}
add(BILL_ADMIN); // "Rp2.500" biaya admin tagihan
for (const v of VOUCHERS) collectItems(v.items);
// Harga metode bayar untuk tiap harga item (tanpa promo) + fee-nya.
for (const base of bases) {
  for (const pay of ALL_PAYMENTS) {
    const t = calcTotals(base, pay, null);
    add(t.total); add(payFee(pay, base));
  }
}
add(0); // "Rp0" biaya QRIS

// --- Bandingkan dengan dump Figma ---
// Format dump (Siklus 44): frames = [frameId, [[nodeId, chars], ...]]
const flagged = [];
let checked = 0;
for (const [frameId, hits] of inner.frames) {
  for (const [id, chars] of hits) {
    for (const m of chars.matchAll(/Rp([\d.]+)/g)) {
      checked++;
      const n = parseInt(m[1].replace(/\./g, ""), 10);
      if (!legit.has(n)) {
        flagged.push({ frame: frameId, id, chars, value: n });
      }
    }
  }
}

// --- "Mulai Rp" harus cocok dengan salah satu `from` game ---
const mulaiBad = [];
for (const [frameId, hits] of inner.frames) {
  for (const [id, chars] of hits) {
    const m = chars.match(/^Mulai Rp([\d.]+)$/);
    if (m) {
      const n = parseInt(m[1].replace(/\./g, ""), 10);
      if (!froms.has(n)) mulaiBad.push({ frame: frameId, id, chars });
    }
  }
}

console.log(`Frame: ${inner.frames.length} | teks Rp dicek: ${checked} | harga sah unik: ${legit.size}`);
if (flagged.length === 0) {
  console.log("OK semua angka Rp di Figma ada di harga sah data.js (item/was/metode/fee).");
} else {
  console.log(`FLAG ${flagged.length} angka Rp TIDAK ada di harga sah:`);
  for (const x of flagged) console.log(`  - ${x.frame} [${x.id}] = Rp${x.value} :: ${x.chars}`);
}
if (mulaiBad.length === 0) {
  console.log("OK semua 'Mulai Rp' cocok dengan `from` salah satu game.");
} else {
  console.log(`FLAG ${mulaiBad.length} 'Mulai Rp' bukan harga from game:`);
  for (const x of mulaiBad) console.log(`  - ${x.frame} [${x.id}] ${x.chars}`);
}
if (flagged.length || mulaiBad.length) process.exit(1);
console.log("\nSemua pemeriksaan harga Figma vs data.js LULUS.");
