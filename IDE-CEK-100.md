# 100 Ide Pengecekan — Rosdi Store

Tanggal: 12 Nov 2026

## Cara pakai

- Satu ide dipakai per satu siklus maraton, urut dari nomor 1 sampai 100, lalu berulang dari nomor 1.
- Setiap ide dirancang untuk dicek tuntas dalam satu putaran: ada frame/halaman/elemen yang diperiksa dan kondisi what-if yang diuji.
- Tulis hasil tiap ide ke `MARATHON-LOG.md`: nomor ide, temuan spesifik (frame + elemen + kondisi), dan ide baru yang lahir dari pengecekan itu.
- Bila satu ide melahirkan perbaikan, terapkan sebagai unit coding siklus itu; bila terlalu besar, masukkan ke antrean log.

---

## A. Animasi & Motion

1. Cek transisi Beranda → Produk Game Mobile Legends: apakah kartu produk muncul dengan easing yang sama di Light dan Dark, tanpa lompatan layout?
2. Cek micro-interaction tombol "Beli Sekarang" di frame Produk Game: apakah ada feedback visual (skala/warna) saat ditekan, dan apakah tombol tidak bisa ditekan dua kali beruntun (double-tap)?
3. Cek animasi badge "-10%" flash sale di kartu Diamond MLBB: apakah badge bergerak/berkedip berlebihan atau diam tenang sesuai sistem desain?
4. Cek animasi loading saat pindah dari halaman Pulsa ke halaman PLN: apakah ada skeleton/indikator, atau layar kosong sesaat?
5. Cek transisi modal pembayaran di frame Produk Game: apakah modal muncul dari bawah dengan easing konsisten di semua game (MLBB, Free Fire, Genshin)?
6. Cek animasi sukses setelah transaksi di layar Sukses: apakah centang/checklist muncul berurutan (bukan sekaligus) dan apakah ada animasi yang tertinggal saat layar ditutup?
7. Cek animasi chip scroll horizontal "Token PLN / E-Wallet / Voucher" di Beranda: apakah scroll terasa halus dan chip terakhir tidak terpotong setengah tanpa petunjuk bisa di-scroll?
8. Cek konsistensi durasi animasi antar halaman (Beranda, Pulsa, PLN, E-Wallet): apakah ada halaman yang transisinya terasa lebih lambat/cepat dari yang lain?

## B. Alur UX End-to-End

9. Cek journey lengkap beli Diamond MLBB 86 dari Beranda sampai layar Sukses: hitung jumlah langkah, apakah ada langkah yang bisa dihapus tanpa kehilangan informasi?
10. Cek journey beli pulsa Telkomsel 25rb: apakah nomor HP yang diketik di awal masih terlihat saat sampai di layar konfirmasi pembayaran?
11. Cek journey Cek Transaksi: apakah pengguna yang baru pertama kali langsung paham harus memasukkan apa (ID transaksi/nomor HP) tanpa penjelasan tambahan?
12. Cek journey beli token PLN 50rb: apakah nomor meter/ID pelanggan diminta di langkah yang tepat, dan apakah ada validasi panjang digit sebelum lanjut?
13. Cek journey top-up GoPay 100rb: apakah pengguna bisa kembali ke langkah sebelumnya tanpa kehilangan nominal yang sudah dipilih?
14. Cek journey beli voucher Steam: apakah pengguna diberi tahu cara redeem voucher SEBELUM bayar, atau baru setelah sukses?
15. Cek journey gagal bayar di tengah jalan (saldo tidak cukup): apakah pengguna dikembalikan ke langkah yang benar dengan pilihan nominal tetap tersimpan?
16. Cek journey pengguna yang salah memasukkan Riot ID di Valorant (tanpa #TAG): apakah pesan error muncul di tempat yang sama dengan kolom input, dan apakah contoh format Nama#TAG terlihat?

## C. Hierarki Visual & Tipografi

17. Cek frame Beranda Light: apakah headline hero "Top up, harga final sejak awal" adalah elemen pertama yang dibaca mata, atau malah tertutup oleh kartu promo di atasnya?
18. Cek kartu harga Diamond di Produk Game: apakah harga final lebih menonjol daripada harga coret, dan apakah mata tidak tertarik dulu ke badge promo?
19. Cek halaman Pulsa: apakah nama operator (Telkomsel, XL, dst.) lebih menonjol daripada nominal, atau sebaliknya — mana yang seharusnya dibaca dulu?
20. Cek layar Sukses: apakah status "Berhasil" dan nomor transaksi terbaca jelas tanpa harus scroll, dan apakah tombol aksi lanjutan tidak kalah menonjol dari detail transaksi?
21. Cek tipografi harga Rp di semua kartu: apakah semua harga memakai tabular-nums (angka sejajar) sehingga Rp10.000 dan Rp100.000 tidak tampak goyang?
22. Cek halaman Cek Transaksi: apakah label kolom (ID, status, tanggal) dibedakan jelas dari isinya lewat bobot/ukuran, bukan hanya warna?
23. Cek kartu paket data 70 paket: apakah nama paket dan kuota (mis. 5GB/30 hari) punya hierarki yang konsisten di semua operator?
24. Cek modal pembayaran: apakah total yang harus dibayar adalah angka terbesar di modal, atau malah kalah besar dari harga item?

## D. Token & Konsistensi Desain

25. Cek semua kartu produk di Beranda: apakah radius sudutnya sama (14px) di semua kartu, termasuk kartu promo dan kartu game?
26. Cek warna biru CTA di semua halaman (Beranda, Pulsa, PLN, E-Wallet, Voucher): apakah semuanya memakai token blue yang sama (#2563EB Light / #3B82F6 Dark)?
27. Cek warna teks sekunder di semua frame: apakah semuanya memakai token sub (#64748B Light / #94A3B8 Dark) dan tidak ada abu-abu lain yang nyasar?
28. Cek garis pemisah (stroke line) di semua kartu: apakah ketebalan dan warnanya konsisten (#E2E8F0 Light / #22314F Dark)?
29. Cek background field input di semua halaman: apakah semuanya memakai token field (#F8FAFC Light / #0E1930 Dark)?
30. Cek warna hijau status sukses: apakah badge "Berhasil" di layar Sukses dan di Cek Transaksi memakai green token yang sama?
31. Cek spacing antar kartu di grid Beranda: apakah jarak vertikal dan horizontal konsisten di semua baris, termasuk baris terakhir?
32. Cek warna soft background (#EFF6FF Light / #16294D Dark): apakah dipakai konsisten untuk area highlight, dan tidak ada area highlight yang memakai biru lain?

## E. Aksesibilitas

33. Cek kontras teks harga Rp di kartu produk dengan background kartu: apakah lolos rasio kontras minimum untuk teks kecil?
34. Cek ukuran target sentuh tombol nominal pulsa (mis. 5rb, 10rb, 25rb): apakah masing-masing minimal 44px dan tidak terlalu rapat sehingga mudah salah tekan?
35. Cek teks kecil di bawah harga (mis. "Harga final, tanpa biaya tambahan"): apakah masih terbaca jelas pada lebar 390px tanpa zoom?
36. Cek label form ID game di Produk Game: apakah setiap kolom input punya label teks yang jelas, bukan hanya placeholder yang hilang saat diketik?
37. Cek perbedaan status transaksi di Cek Transaksi: apakah status "Berhasil", "Proses", "Gagal" dibedakan juga lewat ikon/teks, bukan hanya warna (untuk pengguna buta warna)?
38. Cek navigasi keyboard/tab di kode: apakah pengguna bisa mencapai tombol "Beli" dan memilih nominal hanya dengan keyboard, dan apakah fokusnya terlihat?
39. Cek teks di atas gambar/banner promo: apakah kontrasnya cukup, dan apakah ada teks yang menempel di area gambar yang ramai?

## F. What-if Teks/Konten Ekstrem

40. Cek kartu Diamond MLBB dengan nama paket terpanjang di frame Produk Game: apakah teks nama paket terpotong rapi dengan elipsis atau malah meluber keluar kartu?
41. Cek harga terbesar di katalog (nominal pulsa/data tertinggi): apakah angka Rp-nya muat dalam kartu tanpa mengecilkan font atau menabrak badge?
42. Cek nama game "Arena of Valor" dan "Honor of Kings" di grid Beranda: apakah nama panjang itu muat dalam satu baris atau turun ke dua baris dengan rapi?
43. Cek kolom input Riot ID dengan Nama#TAG sangat panjang (mis. 16 karakter + # + 5 karakter): apakah teks input terpotong atau membuat kolom melebar?
44. Cek deskripsi paket data dengan teks terpanjang (mis. paket kombo kuota+nelpon): apakah deskripsi terpotong konsisten di semua kartu?
45. Cek nomor meter PLN 11 digit di kolom input: apakah angka panjang itu tetap terlihat utuh atau terpotong di ujung kanan?
46. Cek teks promo ROSDI10 di kartu promo: apakah kode promo yang panjang tetap terbaca saat kartu ditampilkan di lebar 320px?
47. Cek ID transaksi terpanjang di layar Sukses dan Cek Transaksi: apakah ID bisa disalin utuh, dan apakah tampilannya tidak memaksa layar scroll horizontal?

## G. What-if Layar & Responsif

48. Cek frame Beranda pada lebar 320px: apakah header (logo + ikon) tetap muat satu baris tanpa ada yang terpotong?
49. Cek kartu Diamond MLBB 86 di lebar 320px: apakah badge "-10%" tetap di dalam kartu dan tidak keluar ke kanan?
50. Cek grid produk game di lebar 320px: apakah kartu tidak saling menumpuk dan jarak antar kartu tetap konsisten?
51. Cek modal pembayaran pada layar pendek (tinggi kecil): apakah tombol bayar tetap terlihat tanpa scroll, atau ada tombol yang tersembunyi di bawah lipatan?
52. Cek halaman PLN pada lebar 320px: apakah 6 denominasi token tersusun rapi dan tidak ada tombol yang terpotong setengah?
53. Cek chip kategori "Token PLN / E-Wallet / Voucher" di lebar 320px: apakah chip pertama terlihat penuh dan pengguna paham masih ada chip lain yang bisa di-scroll?
54. Cek layar Sukses pada layar sangat panjang (konten sedikit): apakah ada ruang kosong besar yang aneh di bawah tombol aksi?
55. Cek halaman Voucher pada lebar 320px: apakah kartu Google Play, Steam, dan PlayStation tetap sejajar rapi tanpa ada yang lebih lebar dari yang lain?

## H. What-if State (Kosong/Loading/Error)

56. Cek halaman Cek Transaksi saat belum ada transaksi sama sekali: apakah ada empty state yang menjelaskan, atau halaman tampil kosong membingungkan?
57. Cek Beranda saat daftar game gagal dimuat (simulasi loading lama): apakah ada skeleton loading, atau layar putih kosong?
58. Cek layar Sukses saat status transaksi masih "Proses" (belum berhasil): apakah pengguna diberi tahu harus menunggu, dan apakah ada tombol cek ulang?
59. Cek halaman Pulsa saat pengguna belum memilih operator: apakah ada petunjuk yang jelas, atau semua nominal tampil tapi tidak bisa diklik tanpa penjelasan?
60. Cek kolom input ID game saat pengguna memasukkan ID yang salah format: apakah pesan error muncul seketika atau baru setelah tombol ditekan?
61. Cek promo ROSDI10 saat sudah kedaluwarsa/digunakan: apakah pengguna diberi tahu sebelum bayar, dan apakah total kembali ke harga normal dengan jelas?
62. Cek halaman E-Wallet saat salah satu e-wallet sedang gangguan (mis. OVO): apakah ada penanda "sementara tidak tersedia" atau pengguna baru tahu setelah bayar gagal?
63. Cek riwayat di Cek Transaksi saat transaksi gagal: apakah status gagal tampil jelas beserta alasan dan tombol "Coba Lagi"?

## I. What-if Mode Light/Dark

64. Cek pasangan frame Beranda Light dan Dark berdampingan: apakah ada elemen (ikon, teks, garis) yang hilang atau nyaris tak terlihat di salah satu mode?
65. Cek kartu produk game di mode Dark: apakah warna inisial/tile game tetap terbaca, dan apakah ada tile yang warnanya bertabrakan dengan background #131F36?
66. Cek harga coret (harga asli sebelum diskon) di mode Dark: apakah masih terlihat jelas sebagai coret, atau warnanya terlalu dekat dengan background?
67. Cek field input di mode Dark: apakah teks yang diketik (mis. nomor HP) kontras dengan field #0E1930, dan apakah placeholder tidak terlalu samar?
68. Cek badge promo "-10%" di mode Dark: apakah warna badge tetap menonjol tanpa menyilaukan, dan apakah teks di dalamnya terbaca?
69. Cek layar Sukses di mode Dark: apakah ikon centang hijau #34D399 terlihat jelas di atas background gelap, dan apakah detail transaksi tidak tenggelam?
70. Cek modal pembayaran di mode Dark: apakah garis pemisah #22314F masih terlihat sebagai pemisah, atau modal tampak seperti satu blok tanpa sekat?

## J. What-if Pengguna (Baru vs Lama)

71. Cek Beranda dari sudut pengguna baru pertama kali: apakah dalam 5 detik pertama ia paham ini toko top-up dan tahu harus menekan apa dulu?
72. Cek halaman Produk Game untuk pengguna baru: apakah ada penjelasan singkat apa itu "Diamond" / "Genesis Crystal", atau diasumsikan pengguna sudah tahu?
73. Cek pengguna lama yang kembali: apakah ada jalan pintas (mis. game yang terakhir dibeli) di Beranda, atau ia harus mencari dari awal lagi?
74. Cek pengguna baru yang memakai promo ROSDI10: apakah syarat promo (minimal belanja, berlaku untuk apa) terlihat sebelum ia memilih produk?
75. Cek pengguna lama dengan banyak riwayat di Cek Transaksi: apakah transaksi terbaru tampil paling atas, dan apakah pencarian/penyaringan mudah ditemukan?
76. Cek pengguna baru yang salah pilih game (mis. klik Free Fire padahal mau MLBB): apakah ia bisa kembali tanpa kehilangan data yang sudah diisi?
77. Cek pengguna yang baru pertama kali top-up PLN: apakah ada penjelasan bahwa token PLN dikirim sebagai kode 20 digit, bukan saldo langsung?

## K. What-if Pembayaran & Harga

78. Cek total akhir pembelian Diamond MLBB 86 dengan semua metode bayar: apakah totalnya konsisten (harga + admin) di setiap metode, tanpa ada yang berbeda diam-diam?
79. Cek biaya admin Rp2.500 untuk 7 kategori tagihan: apakah admin tampil terpisah dari harga tagihan, dan apakah total akhirnya = tagihan + 2.500 persis?
80. Cek promo GAMER5: apakah diskonnya dihitung dari harga item saja (bukan dari total + admin), dan apakah angka diskonnya cocok dengan yang dijanjikan?
81. Cek nominal pulsa Telkomsel 5rb sampai 100rb: apakah harga per metode bayar selalu konsisten dengan total yang ditampilkan di modal?
82. Cek harga token PLN 20rb–1jt: apakah tidak ada denominasi yang harganya tertukar dengan denominasi lain di frame PLN?
83. Cek harga paket data 70 paket di semua operator: apakah ada paket yang harganya sama persis tapi kuotanya beda tanpa penanda yang jelas?
84. Cek voucher Google Play, Steam, PlayStation: apakah harga voucher = nilai voucher (tanpa markup tersembunyi), dan apakah markup (bila ada) ditampilkan jujur?
85. Cek skenario pengguna mengganti metode bayar di detik terakhir (dari QRIS ke transfer bank): apakah total diperbarui seketika, atau masih menampilkan total metode lama?

## L. Performa & Teknis

86. Cek ukuran bundle awal (JS 258,12 kB): apakah ada aset/logo yang dimuat di Beranda padahal baru dibutuhkan di halaman lain (mis. logo 27 produk)?
87. Cek waktu muat Beranda dengan 11 kartu game + logo: apakah ada logo yang gagal/telat muncul sehingga kartu tampil sebagai tile kosong sesaat?
88. Cek build setelah perubahan terakhir: apakah `npm run build` masih lulus dan chunk awal tetap di bawah 260 kB?
89. Cek check:media-order: apakah ada media query yang mati (tidak pernah terpakai) setelah perubahan frame terbaru?
90. Cek sinkron harga Figma vs data.js: apakah 2.302 angka Rp di 132 frame masih 100% cocok, atau ada satu angka yang berubah diam-diam?
91. Cek logo DANA di halaman E-Wallet: apakah DANA masih tampil sebagai tile inisial (karena logo asli belum ada) dan apakah tile itu konsisten dengan tile produk lain yang belum ada logonya?
92. Cek gambar/logo produk di semua frame: apakah ada logo yang pecah, terpotong, atau memakai rasio yang salah (mis. logo Wild Rift yang sebenarnya logo Riot Games)?
93. Cek perilaku saat pengguna menekan tombol kembali (back) di tengah pengisian form: apakah data yang sudah diisi hilang semua, atau tersimpan?

## M. Kepercayaan & Konten/Mikrokopi

94. Cek klaim hero "Top up, harga final sejak awal": apakah ada satu pun harga di katalog yang ternyata berubah di langkah pembayaran (biaya tersembunyi)?
95. Cek mikrokopi di bawah tombol bayar: apakah ada kalimat yang menjanjikan proses instan padahal ada metode yang butuh waktu (mis. transfer bank)?
96. Cek teks bantuan/kontak di Beranda: apakah pengguna yang transaksinya bermasalah bisa menemukan cara menghubungi penjual tanpa mencari ke halaman lain?
97. Cek label "Termurah" atau klaim superlatif lain di semua frame: apakah ada klaim yang tidak bisa dibuktikan dan harus dihapus (seperti klaim "termurah" yang dulu dibuang)?
98. Cek teks status di Cek Transaksi: apakah kata "Proses" dan "Berhasil" dipakai konsisten, dan tidak ada status lain dengan arti sama (mis. "Selesai" vs "Berhasil")?
99. Cek instruksi redeem voucher Steam/PlayStation di layar Sukses: apakah langkah-langkahnya benar, berurutan, dan bisa diikuti pengguna awam?
100. Cek footer/catatan kecil di semua halaman: apakah ada teks legal/syarat yang sudah kedaluwarsa (mis. promo 11.11 yang sudah lewat) dan masih tampil?
