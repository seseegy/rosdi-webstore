# QA Report — Rosdi Webstore (React + Vite)

> **STATUS (Siklus 0–0d, 11 Nov 2026): seluruh temuan di bawah ini SUDAH
> SELESAI** — 6 Should-fix + 8 Nit ditutup di chat utama (lihat
> `MARATHON-LOG.md` Siklus 0–0d). Laporan ini dipertahankan apa adanya
> sebagai arsip audit awal; antrean berikutnya hidup di `MARATHON-LOG.md`.

Audit read-only terhadap `src/App.jsx`, `src/data.js`, `src/index.css`, `index.html`, `src/main.jsx` pada 11 Nov 2026. Build diverifikasi bersih: `npm run build` sukses (dist/index.html 1,46 kB, JS 260,59 kB, CSS 14,48 kB). Semua temuan dibuktikan dari kode dengan nomor baris. Catatan: `src/data.js` berubah selama audit berlangsung (paket data Axis/Smartfren ditambahkan); laporan ini mencerminkan keadaan terakhir yang terverifikasi.

## Temuan

### Should-fix

**1. Harga per metode pembayaran tidak mencerminkan diskon promo — klaim ringkasan jadi salah**
- Lokasi: `src/App.jsx:371` vs `src/App.jsx:290-291` dan `src/App.jsx:426`
- Bukti: baris metode bayar menampilkan `rp(base + f)` (harga + biaya, tanpa diskon), sedangkan total ringkasan adalah `base + fee - disc`. Teks di ringkasan mengklaim "Total ini sama persis dengan harga pada metode pembayaran yang kamu pilih" — klaim itu salah begitu promo (ROSDI10/GAMER5) aktif: harga di kartu metode lebih tinggi dari total yang dibayar.
- Saran: tampilkan harga per metode setelah diskon (atau tampilkan coretan harga lama + harga final) agar selalu sama dengan total ringkasan.

**2. Nomor berawalan tak dikenal lolos validasi pulsa/data — risiko terkirim ke operator yang salah**
- Lokasi: `src/App.jsx:507-508` dan `src/App.jsx:515`
- Bukti: `valid = phoneOk(clean) && !mismatch`; `mismatch` hanya true bila operator terdeteksi DAN berbeda. Bila `detectOperator` mengembalikan null (awalan tidak ada di tabel prefix `src/data.js`), pembelian tetap bisa lanjut di halaman operator mana pun yang sedang dibuka, dan peringatannya hanya note netral "Operator belum dikenali dari awalan nomor ini."
- Saran: untuk mode pulsa/data, anggap nomor tidak valid selama operator belum terdeteksi, dan ubah note menjadi kelas `bad`.

**3. Pencarian beranda hanya menyaring game dan kartu PLN**
- Lokasi: `src/App.jsx:111-118`
- Bukti: `match()` hanya dipakai untuk `GAMES.filter(...)` dan `showPln`. `showPulsa`, `showData`, `showEmoney`, `showVoucher` tidak bergantung pada kueri sama sekali — mengetik apa pun (termasuk kata acak) tetap menampilkan semua kartu pulsa/data/e-wallet/voucher, dan keadaan "tidak ditemukan" (`nothing`) praktis tidak pernah muncul pada kategori "semua". Placeholder pencarian menjanjikan "Cari game, pulsa, token PLN, e-wallet…".
- Saran: terapkan `match()` juga pada nama operator, e-wallet, dan voucher saat memutuskan kartu mana yang tampil.

**4. Tiga tautan Bantuan di footer mati (semuanya ke beranda)**
- Lokasi: `src/App.jsx:85-87`
- Bukti: "Cara Top Up", "Syarat & Ketentuan", dan "Kebijakan Pengembalian" semuanya `href="#/"` — ketiganya hanya pulang ke beranda; tidak ada halaman/bagian tujuan sesuai labelnya (bagian Cara Top Up di beranda pun tidak dituju dengan jangkar).
- Saran: arahkan "Cara Top Up" ke jangkar bagian cara top up di beranda dan buat halaman sederhana untuk S&K serta kebijakan pengembalian, atau hapus tautan yang belum ada halamannya.

**5. Email/WhatsApp di langkah kontak dikumpulkan tapi tidak pernah disimpan atau dipakai**
- Lokasi: `src/App.jsx:279-280`, objek order di `src/App.jsx:302-306`, janji teks di `src/App.jsx:392`
- Bukti: state `email` dan `wa` hanya terikat ke input; objek order yang disimpan `buy()` tidak memuat keduanya. Teks langkah kontak menjanjikan "Bukti pembayaran dan status pesanan dikirim ke kontak ini", tetapi nilainya dibuang begitu pesanan dibuat.
- Saran: sertakan email/wa ke objek order (dan tampilkan di halaman sukses), atau ubah teksnya agar tidak menjanjikan pengiriman bukti.

**6. Teks info harga memakai warna `--faint` yang gagal kontras AA**
- Lokasi: `src/index.css:201` (`.pay .p-fee`, 11px), `src/index.css:136` (`.was`), token di `src/index.css:9` dan `src/index.css:38`
- Bukti: `--faint` terang `#94a3b8` di atas `--field` `#f8fafc` ≈ 2,5:1 untuk teks biaya ("biaya Rp250") dan harga coret — jauh di bawah 4,5:1 untuk teks kecil. Tema gelap: `#64748b` di atas `#131f36` ≈ 3,2:1, juga di bawah ambang.
- Saran: naikkan `--faint` ke abu yang lebih gelap/terang secukupnya (target ≥4,5:1) atau pakai `--sub` khusus untuk `.p-fee` dan `.was`.

### Nit

**7. Link favicon ganda dan identik di `<head>`**
- Lokasi: `index.html:8` dan `index.html:10` — elemen `<link rel="icon">` yang sama persis tertulis dua kali (terkonfirmasi: 2 kemunculan `rel="icon"`).
- Saran: hapus salah satunya.

**8. Semantik tab pada chip kategori setengah jadi**
- Lokasi: `src/App.jsx:135`
- Bukti: pembungkus memakai `role="tablist"`, tetapi tombol chip di dalamnya tidak memiliki `role="tab"` maupun `aria-selected`, sehingga pembaca layar mengumumkan struktur tab tanpa status tab mana pun.
- Saran: tambahkan `role="tab"` + `aria-selected` pada chip, atau hilangkan `role="tablist"` dan biarkan sebagai grup tombol biasa.

**9. Modal Masuk tanpa atribut dialog dan tanpa penutup Escape**
- Lokasi: `src/App.jsx:52`
- Bukti: modal hanya bisa ditutup lewat klik pada veil atau tombol; tidak ada `role="dialog"`/`aria-modal`, tidak ada handler Escape, fokus tidak dipindahkan ke dalam modal.
- Saran: tambahkan `role="dialog" aria-modal="true"` dan listener Escape untuk menutup.

**10. Genshin Impact menjanjikan pemilih server yang tidak ada**
- Lokasi: `src/data.js:80` vs GamePage di `src/App.jsx:443-475`
- Bukti: tagline game tertulis "Via UID, pilih server", tetapi karena `needsZone: false`, halaman produknya hanya merender satu kolom User ID — tidak ada pemilih server dalam bentuk apa pun.
- Saran: tambahkan kolom server (Asia/America/Europe/TW-HK-Mo) untuk Genshin, atau ubah tagline-nya.

**11. Input ID pelanggan PLN tidak membersihkan spasi di tengah**
- Lokasi: `src/App.jsx:535`
- Bukti: validasi `/^\d{11,12}$/.test(idpel.trim())` — `trim()` hanya memangkas ujung, jadi ID yang diketik berkelompok "5123 4567 8901" ditolak. Input nomor HP di halaman lain justru membersihkan spasi/strip lewat `replace(/[\s-]/g, "")`.
- Saran: bersihkan spasi/strip dari ID pelanggan sebelum validasi, sama seperti input HP.

**12. Baris pembayaran dan ringkasan berisiko desak/overflow di layar sempit**
- Lokasi: `src/index.css:200` (`.pay .p-price { white-space: nowrap; }`), `src/index.css` `.sum-row b` tanpa `overflow-wrap`
- Bukti: harga metode tidak boleh membungkus sementara span nama/deskripsi metode tidak diberi `min-width: 0`; pada layar ±320px dengan harga besar (mis. token PLN Rp1.002.500) nama metode terdesak. Hal yang sama berlaku untuk nilai "Tujuan" berisi email panjang di ringkasan.
- Saran: beri `min-width: 0` pada span tengah baris pembayaran dan `overflow-wrap: anywhere` pada `.sum-row b`.

**13. Import `useMemo` tidak dipakai**
- Lokasi: `src/App.jsx:1` — `useMemo` diimpor dari react tetapi tidak dirujuk di mana pun dalam file.
- Saran: hapus dari daftar impor.

**14. Ikon strip kepercayaan memakai glif yang rendernya tidak konsisten**
- Lokasi: `src/App.jsx:237-240` — ikon "⚡", "▦", "✓", "☎" sebagai teks; khususnya "▦" berpotensi tampil sebagai kotak kosong di sebagian perangkat Android.
- Saran: ganti dengan ikon SVG inline seperti yang sudah dipakai pada tombol tema dan pencarian.

## Area yang diperiksa dan bersih

- **Matematika inti checkout**: `base = price × qty`, `fee` lewat `payFee()` yang sama untuk baris metode dan ringkasan (`src/App.jsx:288-291`, `src/App.jsx:364`), diskon dibatasi cap, total tidak pernah negatif; tombol Beli (`canBuy`, `src/App.jsx:292`) nonaktif sampai tujuan valid + item + metode dipilih; metode berstatus "Lagi perbaikan" tidak bisa dipilih.
- **Rute hash**: semua rute utama (home, game, pulsa, data, pln, emoney, voucher, cek, sukses) bekerja; id game/operator/e-wallet/voucher yang tidak dikenal jatuh dengan anggun ke beranda/indeks; `#/sukses` tanpa ref menampilkan pesan kosong yang sopan, bukan crash. `DATA_PACKAGES` kini lengkap untuk keenam operator, jadi `#/data/<operator>` mana pun aman.
- **Konsistensi katalog**: `GAMES[].from` sama dengan harga termurah sebenarnya di data; harga FLASH_SALE sama dengan harga katalog (WDP Rp27.900, FF 70 DM Rp9.450); badge persen cocok angka (WDP −9,7% ≈ −10%, FF pas −10%, ML 706 DM −5,1% ≈ −5%); rincian admin PLN (harga = token + Rp2.500) konsisten antara nama, meta, dan harga.
- **Validasi langkah 1**: ML mewajibkan Zone ID 4–6 digit; PLN mewajibkan Cek Nama sebelum bisa membeli dan mengubah ID mereset hasil cek; voucher mewajibkan format email; ketidakcocokan operator pada nomor HP memblokir pembelian dan menawarkan tautan pindah operator.

## Ringkasan

- Blocker: **0**
- Should-fix: **6**
- Nit: **8**

**3 temuan terpenting:**
1. **#1 — Harga per metode vs total ringkasan berbeda saat promo aktif**, padahal teks ringkasan mengklaim keduanya "sama persis" — ini janji inti toko (transparansi harga) yang dilanggar oleh kode sendiri.
2. **#2 — Nomor berawalan tak dikenal tetap bisa dibeli** di halaman operator yang salah; satu-satunya pengaman hanya note netral, berisiko pulsa/data terkirim ke operator yang keliru.
3. **#4 — Tiga tautan Bantuan di footer mati** (semua ke `#/`), termasuk "Kebijakan Pengembalian" yang justru dirujuk oleh janji garansi di halaman checkout.
