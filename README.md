# Rosdi Store — Webstore (React + Vite)

Toko top up game, pulsa, paket data, token PLN, tagihan pascabayar, dan
e-wallet. Harga final terlihat sebelum membayar — tidak ada biaya siluman.
Katalog di `src/data.js` masih harga contoh dari survei toko pro (Nov 2026);
katalog final diganti data Digiflazz setelah backend live.

## Perintah

```sh
npm install        # pasang dependensi
npm run dev        # server dev Vite (http://localhost:5173)
npm run build      # build produksi ke dist/
npm run preview    # sajikan hasil build (http://localhost:4173)
npm run lint       # oxlint — harus 0 error 0 warning
```

## Pemeriksa konsistensi (harus lulus semua)

```sh
npm run check:catalog        # katalog vs rumus harga (156 kombinasi)
npm run check:chunks         # code-splitting per rute
npm run check:tokens         # semua warna dari token CSS
npm run check:media-order    # media query tidak ada yang mati
npm run check:figma-prices   # harga Figma vs data.js (butuh dump /tmp/qa-scan18.json)
npm run check:theme-contrast # kontras tema Light/Dark
```

## Struktur

- `src/App.jsx` — router hash (`#/game/...`, `#/pulsa/...`, `#/pln`, `#/tagihan/...`, `#/emoney/...`, `#/voucher/...`, `#/cek`, `#/sukses/...`) + tema Light/Dark (tersimpan di `localStorage`, default mengikuti sistem).
- `src/data.js` — katalog, metode bayar, promo, dan satu-satunya rumus harga `calcTotals(base, pay, promo)`.
- `src/lib.js` — helper bersama: navigasi hash, validasi nomor HP, dan penyimpanan order lokal (`loadOrders`/`saveOrder`/`createOrder`).
- `src/components/` — `Header.jsx` (logo, nav, tombol tema, modal Masuk) dan `Footer.jsx` (tautan produk/bantuan, modal S&K & Refund).
- `src/index.css` — semua token warna/font + seluruh gaya (termasuk tema Dark dan media query).
- `src/pages/` — Beranda, halaman produk (semua memakai `CheckoutShell.jsx`), Sukses & Cek Transaksi.
- `scripts/` — pemeriksa konsistensi (`check-*.mjs`), builder/probe Figma (`figma-*.js` + driver `*-run.py`), dan pengukur runtime CDP (`cdp-*.mjs` + `cdp-launch.sh`).
- `MARATHON-LOG.md` — log maraton coding 11–14 Nov 2026; `QA-REPORT.md` — laporan QA awal (semua temuannya sudah selesai, lihat catatan status di berkas itu).

## Aturan penting

- Deploy: webstore diterbitkan ke Vercel (perintah sir, 15 Nov 2026) — sebelumnya sempat ditahan dengan Figma sebagai deliverable utama; riwayat keputusan ada di `MARATHON-LOG.md`.
- Harga per metode bayar harus selalu sama dengan total ringkasan (keduanya memakai `calcTotals`).
- Semua warna dari token CSS di `src/index.css`; tile membawa `color` di entrinya masing-masing.
