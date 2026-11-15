// Pemeriksa konsistensi katalog Rosdi Store (bukan bagian bundle — tidak diimpor App).
// Jalankan: node scripts/check-catalog.mjs
import {
  GAMES, OPERATORS, DATA_PACKAGES, PLN_ITEMS, PLN_ADMIN, EMONEY_ITEMS,
  FLASH_SALE, VOUCHERS, calcTotals, payFee, ALL_PAYMENTS, PROMOS,
  BILLS, BILL_ADMIN, billItem, rp, RIOT_ID_RE,
  GAMES_META, OPERATOR_META, BILLS_META, PULSA_TOKENS, PLN_TOKENS, DATA_TOKENS,
} from "../src/data.js";

let fails = 0;
const check = (ok, msg) => {
  console.log((ok ? "OK   " : "FAIL ") + msg);
  if (!ok) fails++;
};

for (const g of GAMES) {
  const all = Object.values(g.tabs).flat();
  const min = Math.min(...all.map((i) => i.price));
  check(g.from === min, `game ${g.id}: from Rp${g.from} = harga termurah Rp${min}`);
  for (const [tab, items] of Object.entries(g.tabs)) {
    const prices = items.map((i) => i.price);
    check(prices.every((p, i) => i === 0 || p > prices[i - 1]), `game ${g.id}/${tab}: harga menaik`);
    for (const it of items) {
      if (it.was) check(it.price < it.was, `game ${g.id}/${tab} "${it.name}": harga promo < harga coret`);
    }
  }
  if (/server/i.test(g.tagline)) {
    check(Array.isArray(g.servers) && g.servers.length > 0, `game ${g.id}: tagline janji pilih server, data servers ada`);
  }
  // Mode identitas akun: tiap game tepat satu — Riot ID, User ID + Zone ID,
  // atau User ID saja. Tagline "Riot ID" wajib memakai riotId (bukan
  // needsZone: tag Riot 3–5 alfanumerik bukan Zone ID 4–6 digit).
  const idModes = [g.riotId ? 1 : 0, g.needsZone ? 1 : 0].reduce((a, b) => a + b, 0);
  check(idModes <= 1, `game ${g.id}: mode identitas tunggal (riotId/needsZone tidak bentrok)`);
  if (/riot id/i.test(g.tagline)) {
    check(g.riotId === true, `game ${g.id}: tagline janji Riot ID, data riotId ada`);
    check(!g.needsZone, `game ${g.id}: game Riot tidak memakai Zone ID`);
  }
}

// Format Riot ID (nama 3–16 karakter + # + tag 3–5 alfanumerik).
check(RIOT_ID_RE.test("PlayerOne#TAG12"), "riot id: contoh valid lolos");
check(!RIOT_ID_RE.test("PlayerOne"), "riot id: tanpa #tag ditolak");
check(!RIOT_ID_RE.test("AB#TAG12"), "riot id: nama < 3 karakter ditolak");
check(!RIOT_ID_RE.test("PlayerOne#TOOLONG"), "riot id: tag > 5 karakter ditolak");

for (const f of FLASH_SALE) {
  const g = GAMES.find((x) => x.id === f.gameId);
  const item = g && Object.values(g.tabs).flat().find((i) => i.name === f.name);
  check(!!item, `flash sale "${f.name}": ada di katalog ${f.gameId}`);
  if (item) {
    check(item.price === f.price, `flash sale "${f.name}": harga Rp${f.price} = katalog Rp${item.price}`);
    check(item.was === f.was, `flash sale "${f.name}": harga coret Rp${f.was} = katalog Rp${item.was}`);
  }
}

for (const p of PLN_ITEMS) {
  check(p.price === p.tokenValue + PLN_ADMIN, `PLN token ${p.tokenValue}: harga = token + Rp2.500`);
}

// Pascabayar (Tahap 4): 7 kategori, id + initials unik, warna tile keluarga
// token yang sudah ada, contoh ID lolos pola, harga item = tagihan + admin
// Rp2.500 (pola PLN), meta mengikuti pola meta PLN.
check(BILLS.length === 7, `tagihan: ${BILLS.length} kategori pascabayar`);
{
  const ids = new Set(BILLS.map((b) => b.id));
  check(ids.size === BILLS.length, "tagihan: id unik");
  const inits = new Set(BILLS.map((b) => b.initials));
  check(inits.size === BILLS.length, "tagihan: initials unik");
  const family = new Set(["#0f766e", "#0284c7", "#1e3a8a", "#dc2626", "#7c3aed", "#b45309", "#475569", "#2563eb", "#334155", "#be185d", "#4c1d95", "#c2410c"]);
  for (const b of BILLS) {
    check(family.has(b.color), `tagihan ${b.id}: warna tile keluarga token (${b.color})`);
    check(b.pattern.test(b.example), `tagihan ${b.id}: contoh ID "${b.example}" lolos pola`);
    check(Number.isInteger(b.bill.amount) && b.bill.amount > 0, `tagihan ${b.id}: tagihan contoh Rp${b.bill.amount} > 0`);
    const it = billItem(b);
    check(it.price === b.bill.amount + BILL_ADMIN, `tagihan ${b.id}: harga item = tagihan + Rp2.500 (Rp${it.price})`);
    check(it.meta === `Tagihan ${rp(b.bill.amount)} + admin Rp2.500`, `tagihan ${b.id}: meta memuat tagihan + admin`);
  }
}

for (const o of OPERATORS) {
  check(Array.isArray(o.pulsa) && o.pulsa.length >= 6, `operator ${o.id}: tabel pulsa >= 6 nominal (${o.pulsa.length})`);
  const prices = o.pulsa.map((i) => i.price);
  check(prices.every((p, i) => i === 0 || p > prices[i - 1]), `operator ${o.id}: harga pulsa menaik`);
  check(Array.isArray(DATA_PACKAGES[o.id]) && DATA_PACKAGES[o.id].length >= 10, `operator ${o.id}: paket data >= 10 (${DATA_PACKAGES[o.id]?.length ?? 0})`);
  // Tahap 3: tiap paket punya nama unik, harga kelipatan Rp100, dan meta
  // konsisten "… · N hari" (kuota + masa aktif selalu tercantum).
  if (Array.isArray(DATA_PACKAGES[o.id])) {
    const pkgs = DATA_PACKAGES[o.id];
    const names = new Set(pkgs.map((p) => p.name));
    check(names.size === pkgs.length, `operator ${o.id}: nama paket unik (${pkgs.length} paket)`);
    const badMeta = pkgs.filter((p) => !/· \d+ hari/.test(p.meta));
    check(badMeta.length === 0, `operator ${o.id}: meta paket memuat "· N hari"${badMeta.length ? ": " + badMeta.map((p) => p.name).join(", ") : ""}`);
    const badPrice = pkgs.filter((p) => p.price <= 0 || p.price % 100 !== 0);
    check(badPrice.length === 0, `operator ${o.id}: harga paket kelipatan Rp100`);
  }
  // Tabel transfer (bila ada): satu baris per nominal reguler, harga =
  // reguler + 5% dibulatkan ke 100, menaik, nama membawa "(Transfer)".
  if (o.transfer) {
    check(o.transfer.length === o.pulsa.length, `operator ${o.id}: tabel transfer ${o.transfer.length} baris = reguler ${o.pulsa.length}`);
    const tprices = o.transfer.map((i) => i.price);
    check(tprices.every((p, i) => i === 0 || p > tprices[i - 1]), `operator ${o.id}: harga transfer menaik`);
    const tBad = o.transfer.filter((it, i) => it.price !== Math.round((o.pulsa[i].price * 1.05) / 100) * 100 || !it.name.includes("(Transfer)"));
    check(tBad.length === 0, `operator ${o.id}: harga transfer = reguler + 5% (ke 100) & nama "(Transfer)"`);
  }
}

// Prefix nomor HP tidak boleh dimiliki dua operator (deteksi harus unik).
{
  const seen = new Map();
  const dupes = [];
  for (const o of OPERATORS) for (const p of o.prefixes) {
    if (seen.has(p)) dupes.push(`${p} (${seen.get(p)} + ${o.id})`);
    seen.set(p, o.id);
  }
  check(dupes.length === 0, `prefix operator unik (${seen.size} prefix, 0 ganda${dupes.length ? ": " + dupes.join(", ") : ""})`);
}

for (const v of VOUCHERS) {
  const mult = v.id === "google-play" ? 1.1 : v.id === "steam-wallet" ? 1.05 : 1.08;
  for (const it of v.items) {
    const nominal = Number(it.name.replace(/[^\d]/g, ""));
    const expect = Math.round((nominal * mult) / 100) * 100;
    check(it.price === expect, `voucher ${v.id} ${nominal}: harga Rp${it.price} = nominal x ${mult} (Rp${expect})`);
  }
}

check(EMONEY_ITEMS.length >= 5, `e-money: ${EMONEY_ITEMS.length} nominal`);

// Pecahan data (s433 ide 88): META ringan vs data penuh konsisten, string
// `search` tiap game memuat semua nama + harga item tabnya (indeks pencarian
// Home), dan token pencarian cocok dengan katalog (nominal pulsa/PLN, ukuran
// GB paket data). Normalisasi: huruf kecil, buang pemisah/spasi.
{
  const norm = (s) => String(s).toLowerCase().replace(/[.,\s]+/g, "");
  for (const m of GAMES_META) {
    const full = GAMES.find((x) => x.id === m.id);
    check(!!full, `meta game ${m.id}: ada data penuhnya`);
    if (full) {
      for (const [k, v] of Object.entries(m)) {
        if (k === "search") continue;
        check(JSON.stringify(full[k]) === JSON.stringify(v), `meta game ${m.id}: field ${k} = data penuh`);
      }
      const items = Object.values(full.tabs).flat();
      const hay = norm(m.search || "");
      const missing = items.filter((it) => !hay.includes(norm(it.name)) || !hay.includes(String(it.price)));
      check(missing.length === 0, `search ${m.id}: ${items.length} item tab tercakup${missing.length ? " — HILANG: " + JSON.stringify(missing) : ""}`);
    }
  }
  for (const m of OPERATOR_META) {
    const full = OPERATORS.find((x) => x.id === m.id);
    check(!!full, `meta operator ${m.id}: ada data penuhnya`);
    if (full) for (const [k, v] of Object.entries(m)) {
      check(JSON.stringify(full[k]) === JSON.stringify(v), `meta operator ${m.id}: field ${k} = data penuh`);
    }
  }
  for (const m of BILLS_META) {
    const full = BILLS.find((x) => x.id === m.id);
    check(!!full, `meta tagihan ${m.id}: ada data penuhnya`);
    if (full) for (const [k, v] of Object.entries(m)) {
      check(JSON.stringify(full[k]) === JSON.stringify(v), `meta tagihan ${m.id}: field ${k} = data penuh`);
    }
  }
  const pulsaSet = [...new Set(OPERATORS.flatMap((o) => o.pulsa.map((i) => Number(i.name.replace(/[^\d]/g, "")))) )].sort((a, b) => a - b);
  check(JSON.stringify(PULSA_TOKENS) === JSON.stringify(pulsaSet), `token pulsa: ${PULSA_TOKENS.length} nominal = semua nominal pulsa (harga jual = nominal + fee, bukan kunci cari)`);
  const plnSet = [...new Set(PLN_ITEMS.flatMap((p) => [p.tokenValue, p.price]))].sort((a, b) => a - b);
  check(JSON.stringify(PLN_TOKENS) === JSON.stringify(plnSet), `token PLN: ${PLN_TOKENS.length} nilai = nominal + harga token`);
  const gbSet = [...new Set(Object.values(DATA_PACKAGES).flat().map((p) => {
    const m = p.name.match(/(\d+(?:[.,]\d+)?)\s*gb/i);
    return m ? m[1].replace(/[.,]/g, "") + "gb" : null;
  }).filter(Boolean))].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  check(JSON.stringify(DATA_TOKENS) === JSON.stringify(gbSet), `token data: ${DATA_TOKENS.length} ukuran GB = semua ukuran paket`);
}

// Harga per metode bayar == total ringkasan: keduanya harus memakai rumus yang
// sama (calcTotals). Uji semua kombinasi base x metode x promo (termasuk tanpa
// promo) — satu baris ringkasan per kombinasi agar log tetap ringkas.
let combos = 0, priceBad = 0;
for (const base of [1650, 43500, 100000, 189900]) {
  for (const promo of [null, PROMOS.ROSDI10, PROMOS.GAMER5]) {
    for (const p of ALL_PAYMENTS) {
      combos++;
      const t = calcTotals(base, p, promo);
      const disc = promo ? Math.min(Math.floor(base * promo.pct), promo.cap) : 0;
      if (t.fee !== payFee(p, base) || t.disc !== disc || t.total !== Math.max(0, base + t.fee - t.disc)) priceBad++;
    }
  }
}
check(priceBad === 0, `calcTotals: ${combos} kombinasi base x metode x promo konsisten (fee/diskon/total)`);

console.log(fails === 0 ? "\nSemua pemeriksaan katalog LULUS." : `\n${fails} pemeriksaan GAGAL.`);
process.exit(fails === 0 ? 0 : 1);
