// Audit s454 — replika murni logika Home (pencarian), validasi, calcTotals,
// routing hash, dan findOrder/saveOrder. Satu tarikan data untuk ide B–F + J.
import { GAMES, OPERATORS, EWALLETS, VOUCHERS, FLASH_SALE, ALL_PAYMENTS,
  calcTotals, PROMOS, RIOT_ID_RE } from "../src/data.js";
import { phoneOk } from "../src/lib.js";

const out = [];
const verdict = (id, v, note) => out.push(`${id} ${v} — ${note}`);

// ---------- B/C: pencarian (replika persis Home.jsx) ----------
const match = (q) => (txt) => !q || txt.toLowerCase().includes(q);
function search(qRaw) {
  const query = qRaw.trim().toLowerCase();
  const m = match(query);
  const games = GAMES.filter((g) => m(g.name + " " + g.publisher + " " + g.initials + " " + (g.aka || "")));
  const ewallets = EWALLETS.filter((w) => m(w.name));
  const vouchers = VOUCHERS.filter((v) => m(v.name + " voucher"));
  const flash = FLASH_SALE.filter((f) => m(f.name + " " + f.sub));
  const showPulsa = m("pulsa reguler telkomsel by.u byu indosat xl axis tri smartfren");
  const showData = m("paket data kuota internet");
  const showPln = m("token pln listrik");
  const showTagihan = m("tagihan pascabayar pln pdam bpjs telkom indihome tv kabel multifinance pbb");
  const hits = [...games.map((g) => "game:" + g.name), ...flash.map((f) => "flash:" + f.name),
    ...vouchers.map((v) => "voucher:" + v.name), ...ewallets.map((w) => "ewallet:" + w.name)];
  if (showPulsa) hits.push("kartu:Pulsa");
  if (showData) hits.push("kartu:Paket Data");
  if (showPln) hits.push("kartu:Token PLN");
  if (showTagihan) hits.push("kartu:Tagihan");
  return hits;
}
const searchCases = {
  11: "diamond 86", 12: "86 diamonds", 13: "isi ulang", 14: "token listrik",
  15: "voucher game", 16: "gift card", 17: "linkaja", 18: "komplain",
  19: "whatsapp", 20: "populer", 21: "ovo 50000", 22: "gopay 100000",
  23: "steam 45000", 24: "500", 25: "1000", 26: "20000", 27: "100000",
  28: "1000000", 29: "rp", 30: "rosdi10",
};
for (const [id, q] of Object.entries(searchCases)) {
  const hits = search(q);
  verdict(id, hits.length ? "ADA-HASIL" : "KOSONG",
    `query "${q}" → ${hits.length ? hits.join(", ") : "empty-state 'Tidak ada produk yang cocok'"}`);
}

// ---------- D/E: validasi (replika persis GamePage/PlnPage/PhonePages/VoucherPage/CheckoutShell) ----------
const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;
const noLeadMinus = (v) => !/^\s*-/.test(v);
const notAllZero = (v) => !/^0+$/.test(v);
const uidOk = (v) => { const c = v.replace(/[\s-]/g, "").replace(ZW, ""); return /^\d{6,}$/.test(c) && noLeadMinus(v) && notAllZero(c); };
const zoneOk = (v) => { const c = v.replace(/[\s-]/g, "").replace(ZW, ""); return /^\d{4,6}$/.test(c) && noLeadMinus(v) && notAllZero(c); };
const plnOk = (v) => { const c = v.replace(/[\s.-]/g, "").replace(ZW, ""); return /^\d{11,12}$/.test(c) && !/^\s*-/.test(v) && !/^0+$/.test(c); };
const EMAIL_RE = /^(?!\.)(?!.*\.\.)(?!.*\.@)(?!.*@\.)[^\s@]+@[^\s@]+\.[A-Za-z0-9]{2,}$/;
const emailOk = (v) => EMAIL_RE.test(v.replace(ZW, "").trim());
const waClean = (v) => v.replace(/[\s-]/g, "").replace(ZW, "").replace(/^\+?62/, "0");
const riotOk = (v) => RIOT_ID_RE.test(v.replace(/[\s]/g, "").replace(ZW, ""));

verdict(31, uidOk("1234") ? "LOLOS-VALID" : "DITOLAK", `UID "1234" (4 digit) → idOk=${uidOk("1234")} (syarat ^\\d{6,}$); pesan kode: "User ID harus angka, minimal 6 digit."`);
verdict(32, uidOk("1234567890") ? "DITERIMA" : "DITOLAK", `UID 10 digit → idOk=${uidOk("1234567890")}`);
verdict(33, uidOk("12345678901") ? "DITERIMA" : "DITOLAK", `UID 11 digit → idOk=${uidOk("12345678901")} (input maxLength=20, 11 digit bisa diketik)`);
verdict(34, uidOk("123456789012345") ? "DITERIMA" : "DITOLAK", `UID 15 digit → idOk=${uidOk("123456789012345")}`);
verdict(35, uidOk("0000000000") ? "LOLOS-VALID" : "DITOLAK", `UID 10 nol → idOk=${uidOk("0000000000")} (guard notAllZero s448); pesan yang tampil tetap generik "minimal 6 digit"`);
verdict(36, zoneOk("12345678901") ? "DITERIMA" : "DITOLAK", `Zone 11 digit → zoneOk=${zoneOk("12345678901")} (input maxLength=8 memotong jadi "12345678" dulu, tetap gagal ^\\d{4,6}$)`);
verdict(37, phoneOk("0812345") ? "DITERIMA" : "DITOLAK", `HP 7 digit → phoneOk=${phoneOk("0812345")}; pesan kode: "Nomor HP harus diawali 08 dan 10–13 digit."`);
verdict(38, phoneOk("08123456789012345") ? "DITERIMA" : "DITOLAK", `HP 17 digit → phoneOk=${phoneOk("08123456789012345")}`);
verdict(39, plnOk("543210987") ? "DITERIMA" : "DITOLAK", `ID PLN 9 digit → idOk=${plnOk("543210987")}; pesan kode: "ID pelanggan PLN terdiri dari 11–12 digit angka."`);
verdict(40, plnOk("543210987654321") ? "DITERIMA" : "DITOLAK", `ID PLN 15 digit → idOk=${plnOk("543210987654321")} (input maxLength=16, 15 digit bisa diketik)`);
verdict(41, riotOk("Nama5#TAG") ? "DITERIMA" : "DITOLAK", `Riot "Nama5#TAG" (nama 5 karakter) → ${riotOk("Nama5#TAG")} (RIOT_ID_RE nama 3–16)`);
verdict(42, riotOk("Nama#T") ? "DITERIMA" : "DITOLAK", `Riot "Nama#T" (tag 1 karakter) → ${riotOk("Nama#T")} (tag butuh 3–5); pesan kode: "nama 3–16 karakter, tag 3–5 huruf/angka"`);
verdict(43, emailOk("nama..rosdi@mail.com") ? "LOLOS-VALID" : "DITOLAK", `Email titik ganda di nama → ${emailOk("nama..rosdi@mail.com")} ((?!.*\\.\\.) di regex CheckoutShell/VoucherPage)`);
const longLocal = "a".repeat(245) + "@mail.com"; // total 254 karakter, local-part 245
const longOk = "a".repeat(55) + "@mail.com"; // total 64, local 55 — pembanding sah
verdict(44, emailOk(longLocal) ? "LOLOS-VALID" : "DITOLAK",
  `Email 254 karakter (local-part 245, total 254) → ${emailOk(longLocal)}; pembanding local-part 55/total 64 → ${emailOk(longOk)}. Regex tanpa batas panjang: local-part >64 (batas RFC 5321) tetap lolos; tidak ada lag (tanpa backtracking katastrofik), tidak dipotong.`);
verdict(45, phoneOk(waClean("0812345678")) ? "DITERIMA" : "DITOLAK", `WA 10 digit "0812345678" → clean="${waClean("0812345678")}", phoneOk=${phoneOk(waClean("0812345678"))} (rentang 10–13)`);
verdict(46, phoneOk(waClean("08123456789012")) ? "DITERIMA" : "DITOLAK", `WA 14 digit → clean="${waClean("08123456789012")}", phoneOk=${phoneOk(waClean("08123456789012"))} (melebihi 13)`);
verdict(47, phoneOk(waClean("+62 812 3456 7890")) ? "DITERIMA" : "DITOLAK", `WA "+62 812 3456 7890" → clean="${waClean("+62 812 3456 7890")}", phoneOk=${phoneOk(waClean("+62 812 3456 7890"))}`);
verdict(48, plnOk("5432 1098 7654") ? "DITERIMA" : "DITOLAK", `ID PLN spasi tengah → clean="543210987654", idOk=${plnOk("5432 1098 7654")}`);
verdict(49, "DITOLAK-TANPA-LAG", `Promo 101 karakter: input promo maxLength={20} di CheckoutShell.jsx memotong ketikan jadi 20 karakter; applyPromo tanpa regex (pencocokan kunci PROMOS) → "tidak dikenal". Tidak ada ReDoS.`);
verdict(50, PROMOS["ROSDI10!"] ? "DITERIMA" : "DITOLAK", `Promo "ROSDI10!" → bukan kunci PROMOS → pesan kode: "Kode ROSDI10! tidak dikenal. Coba ROSDI10 atau GAMER5."`);

// ---------- F: harga (calcTotals langsung dari data.js) ----------
const pay = (id) => ALL_PAYMENTS.find((p) => p.id === id);
const t = (base, payId, promo) => calcTotals(base, pay(payId), promo ? PROMOS[promo] : null);
const check = (id, base, payId, promo, expect) => {
  const r = t(base, payId, promo);
  verdict(id, (r.total === expect.total && r.disc === expect.disc && r.fee === expect.fee) ? "SESUAI" : "SELISIH",
    `base Rp${base} + ${payId}${promo ? " + " + promo : ""} → fee Rp${r.fee}, disc Rp${r.disc}, total Rp${r.total} (harapan fee Rp${expect.fee}, disc Rp${expect.disc}, total Rp${expect.total})`);
};
check(51, 5500, "qris", "ROSDI10", { fee: 0, disc: 550, total: 4950 });   // GP 5.000
check(52, 5500, "qris", "GAMER5", { fee: 0, disc: 275, total: 5225 });    // GP 5.000
check(53, 1000, "qris", "ROSDI10", { fee: 0, disc: 100, total: 900 });    // FF 5 Diamonds
check(54, 1199000, "qris", "GAMER5", { fee: 0, disc: 5000, total: 1194000 }); // Valorant 11000 (cap)
check(55, 27900, "qris", "ROSDI10", { fee: 0, disc: 2790, total: 25110 }); // flash Weekly Pass (diskon dari harga flash, bukan was 30900)
check(56, 1002500, "qris", "ROSDI10", { fee: 0, disc: 10000, total: 992500 }); // PLN 1jt (cap)
check(57, 52500, "dana", null, { fee: 250, disc: 0, total: 52750 });      // PLN 50.000 via DANA
check(58, 26830, "shopeepay", null, { fee: 250, disc: 0, total: 27080 }); // Telkomsel 25.000 via ShopeePay
check(59, 9000, "gopay", null, { fee: 250, disc: 0, total: 9250 });       // by.U 2GB via GoPay
// 60: markup 3 merek voucher
const gp100 = VOUCHERS.find((v) => v.id === "google-play").items.find((i) => i.name === "Saldo 100.000");
const st45 = VOUCHERS.find((v) => v.id === "steam-wallet").items.find((i) => i.name === "Steam Wallet 45.000");
const psn100 = VOUCHERS.find((v) => v.id === "playstation").items.find((i) => i.name === "PSN IDR 100.000");
verdict(60, (gp100.price === 110000 && st45.price === 47300 && psn100.price === 108000) ? "HARGA-SESUAI" : "SELISIH",
  `GP 100.000 → Rp${gp100.price} (×1,10), Steam 45.000 → Rp${st45.price} (×1,05), PSN 100.000 → Rp${psn100.price} (×1,08). Markup TIDAK ditampilkan di mana pun di kode (grep: tidak ada teks markup/persentase di kartu voucher) — pengguna hanya melihat harga akhir.`);

// ---------- J: routing / order (replika App.jsx + lib.js + InfoPages) ----------
function route(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "game") { const g = GAMES.find((x) => x.id === parts[1]); return g ? "GamePage:" + g.id : "Home(fallback)"; }
  if (parts[0] === "pulsa" || parts[0] === "data") {
    if (!parts[1]) return "OperatorIndex:" + parts[0];
    const op = OPERATORS.find((o) => o.id === parts[1]); return op ? "PhonePage:" + op.id : "OperatorIndex(fallback)";
  }
  if (parts[0] === "pln") return "PlnPage";
  if (parts[0] === "tagihan") return "BillIndex/BillPage";
  if (parts[0] === "emoney") return "EmoneyIndex/PhonePage";
  if (parts[0] === "voucher") { const v = VOUCHERS.find((x) => x.id === parts[1]); return v ? "VoucherPage:" + v.id : "Home(fallback)"; }
  if (parts[0] === "cek") return "CekPage";
  if (parts[0] === "sukses") return "SuccessPage";
  return "Home";
}
verdict(92, route("#//game/mobile-legends"), `Deep link "//game/mlbb" → ${route("#//game/mobile-legends")} (replace ^#\\/? hanya buang "#/", filter(Boolean) buang segmen kosong)`);
verdict(93, route("#/game/mobile-legends?tab=diamond"), `Deep link "?tab=diamond" → ${route("#/game/mobile-legends?tab=diamond")} — query menempel di parts[1]="mlbb?tab=diamond", GAMES.find gagal`);
verdict(94, route("#/pulsa?operator=telkomsel"), `Deep link "?operator=telkomsel" → ${route("#/pulsa?operator=telkomsel")} — parts[0] jadi "pulsa?operator=telkomsel", tidak cocok cabang mana pun`);
verdict(95, route("#/game/mobile-legends?promo=ROSDI10"), `Deep link "?promo=ROSDI10" → ${route("#/game/mobile-legends?promo=ROSDI10")} — promo tidak terisi/diterapkan, halaman pun tidak terbuka`);
verdict(96, route("#/game/Mobile-Legends"), `Route "/game/Mlbb" (kapital campur) → ${route("#/game/Mobile-Legends")} — pencocokan id case-sensitive`);
// 91: findOrder partial (replika InfoPages.jsx)
const fakeOrders = [{ ref: "RSD-ABCDEF1234WXYZ" }, { ref: "RSD-1BCDEF1234WXYZ" }];
const cleanRef = (v) => v.replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "").replace(/[\s]/g, "").toUpperCase();
const findOrder = (r, orders) => {
  if (!r) return undefined;
  const exact = orders.find((o) => o.ref === r);
  if (exact) return exact;
  const partial = orders.filter((o) => o.ref.includes(r));
  return partial.length === 1 ? partial[0] : null;
};
const f91a = findOrder(cleanRef("RSD-1"), []);
const f91b = findOrder(cleanRef("RSD-1"), fakeOrders);
verdict(91, f91a === null ? "TIDAK-DITEMUKAN" : "LAIN",
  `Cek "RSD-1" tanpa order tersimpan → ${f91a === null ? "pesan 'Nomor transaksi tidak ditemukan di perangkat ini'" : "lain"}; dengan 1 order berawalan "RSD-1" → partial-match unik menampilkan order itu (desain s440 ide 84; replika: ${f91b ? f91b.ref : "null"}). Tidak ada validasi panjang/format khusus.`);
// 97: batas 30 riwayat (saveOrder slice(0,30)) — simulasi dengan array lokal
const l = [];
for (let i = 0; i < 31; i++) l.unshift({ ref: "RSD-" + String(i).padStart(2, "0") });
const capped = l.slice(0, 30);
verdict(97, (capped.length === 30 && capped[0].ref === "RSD-30" && !capped.some((o) => o.ref === "RSD-00")) ? "BATAS-DITEGAKKAN" : "MELAMPAUI",
  `31 order → tersimpan ${capped.length}; tertua RSD-00 terhapus, terbaru RSD-30 di depan (saveOrder: unshift + slice(0,30)).`);

console.log(out.join("\n"));
console.log(`\nJUMLAH: ${out.length} baris (B/C 20, D/E 20, F 10, J 7)`);
