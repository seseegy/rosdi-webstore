// Helper bersama: navigasi hash, validasi nomor HP, dan penyimpanan order lokal.
// Tidak mengimpor React — dipakai App, halaman produk, dan halaman info.
// Pencarian Beranda (akar s452-1): tokenisasi AND + normalisasi, supaya query
// "nama + angka" ketemu — dulu substring utuh ("mlbb 86" gagal karena tidak
// ada substring "mlbb 86" di "Mobile Legends").
// - normSearch: huruf kecil, buang aksen (NFD), buang pemisah ribuan ./,
//   rapatkan spasi. "Rp1.650" -> "rp1650", "Móbile" -> "mobile".
// - searchTokens: pecah per kata; awalan "rp" dibersihkan ("rp1650" ->
//   "1650"); token 1 karakter dibuang ("a" tidak bermakna, "60" tetap).
// - matchSearch: SEMUA token harus ada (AND) di teks yang dinormalisasi;
//   query kosong / tanpa token valid -> cocok (tampilkan semua).
export const normSearch = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
export const searchTokens = (q) =>
  normSearch(q)
    .split(" ")
    .map((t) => t.replace(/^rp/, ""))
    .filter((t) => t.length >= 2);
export const matchSearch = (query, haystack) => {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;
  const hay = normSearch(haystack);
  return tokens.every((t) => hay.includes(t));
};

// Fase 4 B6 (s466-7): kontak (email/WA) dipakai bersama antar-halaman
// dalam satu sesi — sebelumnya state hidup per instance CheckoutShell,
// pindah halaman = isi ulang. Simpan modul-level (umur = umur halaman,
// hilang saat refresh, sesuai "dalam satu sesi"); CheckoutShell membaca
// saat mount dan menulis balik tiap ketikan.
let sharedContact = { email: "", wa: "" };
export const getContact = () => ({ ...sharedContact });
export const setContact = (c) => { sharedContact = { ...sharedContact, ...c }; };

export const go = (path) => { window.location.hash = path; };
export const phoneOk = (p) => /^08\d{8,11}$/.test(p.replace(/[\s-]/g, ""));

export const loadOrders = () => { try { return JSON.parse(localStorage.getItem("rosdi_orders") || "[]"); } catch { return []; } };
// s433 ide 45: setItem bisa melempar (kuota penuh / storage dinonaktifkan) —
// jangan jatuhkan aplikasi; nilai balik false berarti order tidak tersimpan.
// Catatan: pemanggil saat ini (buy() di CheckoutShell.jsx) mengabaikan nilai
// balik itu — Sukses tetap menampilkan "tidak ditemukan" seperti dulu.
// Menampilkan error penyimpanan yang jelas di alur beli masih antrean.
export const saveOrder = (o) => { try { const l = loadOrders(); l.unshift(o); localStorage.setItem("rosdi_orders", JSON.stringify(l.slice(0, 30))); return true; } catch { return false; } };
const TOKEN_LEN = 20;
export const genToken = () => Array.from({ length: TOKEN_LEN }, () => Math.floor(Math.random() * 10)).join("").replace(/(.{4})/g, "$1 ").trim();
// Fase 4 B6 (s466-10): kode voucher 16 karakter (4×4, tanpa 0/O/1/I agar
// tidak tertukar saat dibaca) — dibuat saat order, tampil di Sukses.
const VOUCHER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const genVoucherCode = () => Array.from({ length: 16 }, () => VOUCHER_CHARS[Math.floor(Math.random() * VOUCHER_CHARS.length)]).join("").replace(/(.{4})(?=.)/g, "$1-");

// Pembuatan order: satu-satunya tempat pemanggilan impure (Date.now /
// Math.random) untuk ref, waktu, dan token PLN hidup. Sebelumnya ketiganya
// ditulis langsung di handler buy() CheckoutShell.jsx, sehingga oxlint
// react(purity) menandai komponen itu tidak bisa dioptimasi React Compiler.
// Dipindah ke sini agar komponen tetap murni saat render; perilaku dan
// format ref ("RSD-" + 6 digit base36 + 2 digit acak) tidak berubah.
export const createOrder = ({ kind, title, item, qty, target, base, fee, disc, total, method, email, wa, admin }) => {
  // s433 ide 59: ref lama (Date.now base36 + 2 digit acak) bisa ditebak dari
  // perkiraan waktu beli (hanya 90 kemungkinan per satuan waktu) — tambah
  // 4 karakter acak base36 (~1,7 juta kombinasi) agar tidak bisa dihitung.
  const ref = "RSD-" + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
  return {
    ref, kind, product: title, item: item.name, qty, target,
    base, fee, disc, total, method, time: Date.now(), status: "Diproses", email: email.trim(), wa: wa.trim(),
    token: kind === "pln" ? genToken() : null,
    // Fase 4 B6: code = kode voucher (s466-10, hanya kind voucher);
    // admin = biaya admin tagihan (s452-2, hanya kind tagihan — base sudah
    // termasuk admin, jadi Sukses butuh angka ini untuk memisah rincian).
    code: kind === "voucher" ? genVoucherCode() : null,
    admin: admin ?? null,
  };
};
