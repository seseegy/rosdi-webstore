// Barrel katalog — HANYA untuk skrip check (node) dan impor lama.
// Kode aplikasi JANGAN mengimpor dari sini: App/Home/Header/Footer memakai
// ./data-core.js (ringan, chunk awal), halaman produk memakai
// ./data-catalog.js (berat, lazy chunk).
export * from "./data-core.js";
export * from "./data-catalog.js";
