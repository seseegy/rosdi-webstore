// Katalog berat Rosdi Store — modul LAZY, hanya diimpor halaman produk
// (GamePage, PhonePages, PlnPage, BillPages) dan skrip check. JANGAN diimpor
// dari App/Home/Header/Footer (chunk awal). Data penuh dibangun dari META di
// data-core.js + detail di sini, supaya tidak ada duplikasi fakta.
import { GAMES_META, OPERATOR_META, BILLS_META, PLN_ADMIN, BILL_ADMIN, rp } from "./data-core.js";

const pulsaTable = (rows) => rows.map(([n, p]) => ({ name: "Pulsa " + n.toLocaleString("id-ID"), price: p, meta: "Pulsa reguler" }));
// Pulsa transfer: harga reguler + 5% (biaya transfer antar nomor), dibulatkan
// ke 100 — mengikuti pola pasar; nama membawa "(Transfer)" agar order,
// ringkasan, dan riwayat membedakan keduanya tanpa perubahan CheckoutShell.
// Meta menegaskan aturan produknya: transfer hanya ke nomor sesama operator.
const transferTable = (rows) => rows.map(([n, p]) => ({ name: "Pulsa " + n.toLocaleString("id-ID") + " (Transfer)", price: Math.round((p * 1.05) / 100) * 100, meta: "Ke nomor sesama operator" }));
// Operator yang mendukung transfer pulsa: satu sumber baris untuk kedua
// tabel, jadi harga transfer tidak bisa drift dari harga reguler.
const pulsaRows = (rows) => ({ pulsa: pulsaTable(rows), transfer: transferTable(rows) });
const GAME_TABS = {
  "mobile-legends": {
      "Diamonds": [
        { name: "3 Diamonds", price: 1650 }, { name: "5 Diamonds", price: 1700 },
        { name: "12 Diamonds", price: 3850 }, { name: "28 Diamonds", price: 8950 },
        { name: "44 Diamonds", price: 13900 }, { name: "59 Diamonds", price: 18500 },
        { name: "86 Diamonds", price: 21580, meta: "78 + 8 bonus" },
        { name: "172 Diamonds", price: 43500, badge: "Terlaris", meta: "156 + 16 bonus" },
        { name: "257 Diamonds", price: 64900 }, { name: "344 Diamonds", price: 86500 },
        { name: "514 Diamonds", price: 129000 }, { name: "706 Diamonds", price: 175500, was: 185000, badge: "-5%" },
        { name: "1050 Diamonds", price: 262000 }, { name: "2195 Diamonds", price: 548000 },
      ],
      "Weekly Pass": [
        { name: "Weekly Diamond Pass", price: 27900, was: 30900, badge: "Flash sale", meta: "20 DM langsung + 20 DM/hari selama 7 hari" },
        { name: "2x Weekly Diamond Pass", price: 55500, meta: "Ditumpuk 2 minggu" },
        { name: "Twilight Pass", price: 128000, meta: "Skin epic + hadiah misi" },
      ],
    },
  "free-fire": {
      "Diamonds": [
        { name: "5 Diamonds", price: 1000 }, { name: "12 Diamonds", price: 1900 },
        { name: "50 Diamonds", price: 6800 }, { name: "70 Diamonds", price: 9450, was: 10500, badge: "-10%" },
        { name: "140 Diamonds", price: 18900, badge: "Terlaris" }, { name: "355 Diamonds", price: 47500 },
        { name: "720 Diamonds", price: 94000 }, { name: "1450 Diamonds", price: 187000 },
      ],
      "Membership": [
        { name: "Membership Mingguan", price: 29000, meta: "450 DM selama 7 hari" },
        { name: "Booyah Pass", price: 45000, meta: "Pass musim berjalan" },
        { name: "Membership Bulanan", price: 89000, meta: "2600 DM selama 30 hari" },
      ],
    },
  "genshin-impact": {
      "Genesis Crystal": [
        { name: "60 Genesis Crystals", price: 12500 }, { name: "330 Genesis Crystals", price: 62000, badge: "Terlaris" },
        { name: "1090 Genesis Crystals", price: 189000 }, { name: "2240 Genesis Crystals", price: 379000 },
        { name: "3880 Genesis Crystals", price: 619000 },
      ],
      "Blessing": [
        { name: "Blessing of the Welkin Moon", price: 62000, meta: "90 GC/hari selama 30 hari" },
      ],
    },
  "pubg-mobile": {
      "UC": [
        { name: "60 UC", price: 14500 }, { name: "325 UC", price: 72000, badge: "Terlaris" },
        { name: "660 UC", price: 144000 }, { name: "1800 UC", price: 379000 },
      ],
    },
  "honor-of-kings": {
      "Token": [
        { name: "16 Tokens", price: 1500 }, { name: "80 Tokens", price: 7200 },
        { name: "240 Tokens", price: 21500, badge: "Terlaris" }, { name: "400 Tokens", price: 35500 },
        { name: "800 Tokens", price: 71000 }, { name: "2400 Tokens", price: 212000 },
      ],
      "Weekly Card": [
        { name: "Weekly Card", price: 14500, meta: "Token harian selama 7 hari" },
        { name: "Weekly Card Plus", price: 42000, meta: "Token harian lebih besar, 7 hari" },
      ],
    },
  "roblox": {
      "Robux": [
        { name: "80 Robux", price: 15500 }, { name: "400 Robux", price: 75000, badge: "Terlaris" },
        { name: "800 Robux", price: 149000 }, { name: "1700 Robux", price: 299000 },
      ],
    },
  "valorant": {
      "Points": [
        { name: "475 Points", price: 59000 }, { name: "1000 Points", price: 119000, badge: "Terlaris" },
        { name: "2050 Points", price: 239000 }, { name: "3650 Points", price: 419000 },
        { name: "5350 Points", price: 599000 }, { name: "11000 Points", price: 1199000 },
      ],
    },
  "cod-mobile": {
      "CP": [
        { name: "80 CP", price: 15000 }, { name: "400 CP", price: 75000, badge: "Terlaris" },
        { name: "800 CP", price: 149000 }, { name: "2000 CP", price: 369000 },
        { name: "5000 CP", price: 899000 },
      ],
    },
  "wild-rift": {
      "Wild Cores": [
        { name: "475 Wild Cores", price: 79000 }, { name: "1000 Wild Cores", price: 159000, badge: "Terlaris" },
        { name: "1850 Wild Cores", price: 299000 }, { name: "3275 Wild Cores", price: 499000 },
        { name: "5650 Wild Cores", price: 829000 },
      ],
    },
  "arena-of-valor": {
      "Voucher": [
        { name: "40 Vouchers", price: 15000 }, { name: "100 Vouchers", price: 31000 },
        { name: "230 Vouchers", price: 72000, badge: "Terlaris" }, { name: "460 Vouchers", price: 144000 },
        { name: "950 Vouchers", price: 289000 },
      ],
    },
  "delta-force": {
      "Delta Coins": [
        { name: "60 Delta Coins", price: 15000 }, { name: "300 Delta Coins", price: 74000, badge: "Terlaris", meta: "300 + 20 bonus" },
        { name: "680 Delta Coins", price: 164000, meta: "680 + 70 bonus" }, { name: "1980 Delta Coins", price: 479000 },
        { name: "3280 Delta Coins", price: 789000, meta: "3280 + 670 bonus" },
      ],
    },
};

// Game lengkap = META (identitas + ringkasan + search) + tab nominal.
export const GAMES = GAMES_META.map((g) => ({ ...g, tabs: GAME_TABS[g.id] }));

const OPERATOR_DETAILS = {
  "telkomsel": { prefixes: ["0811","0812","0813","0821","0822","0823"],
    ...pulsaRows([[5000,6500],[10000,12297],[15000,16705],[20000,21768],[25000,26830],[30000,31892],[50000,51907],[75000,74757],[100000,97968],[150000,148737],[200000,197828]]) },
  // by.U: merek digital Telkomsel — prefix 0851/0852/0853 pindah dari
  // Telkomsel ke sini (sebelumnya salah tergabung di Telkomsel).
  "byu": { prefixes: ["0851","0852","0853"],
    ...pulsaRows([[5000,6400],[10000,12100],[15000,16600],[20000,21600],[25000,26600],[30000,31600],[50000,51600],[75000,74600],[100000,97600],[150000,148500],[200000,197500]]) },
  "indosat": { prefixes: ["0814","0815","0816","0855","0856","0857","0858"],
    ...pulsaRows([[5000,6300],[10000,11900],[15000,16400],[20000,21400],[25000,26400],[30000,31300],[50000,51400],[75000,73900],[100000,97400],[150000,147900],[200000,197400]]) },
  "xl": { prefixes: ["0817","0818","0819","0859","0877","0878"],
    ...pulsaRows([[5000,6400],[10000,12100],[15000,16600],[20000,21600],[25000,26600],[30000,31600],[50000,51600],[75000,74400],[100000,97600],[150000,148200],[200000,197600]]) },
  "axis": { prefixes: ["0831","0832","0833","0838"],
    pulsa: pulsaTable([[5000,5900],[10000,11400],[15000,15900],[20000,20900],[25000,25900],[30000,30900],[50000,50900],[75000,73900],[100000,96900],[150000,147400],[200000,196900]]) },
  "tri": { prefixes: ["0895","0896","0897","0898","0899"],
    ...pulsaRows([[5000,5800],[10000,11200],[15000,15700],[20000,20700],[25000,25700],[30000,30700],[50000,50700],[75000,73700],[100000,96700],[150000,147200],[200000,196700]]) },
  "smartfren": { prefixes: ["0881","0882","0883","0884","0885","0886","0887","0888","0889"],
    pulsa: pulsaTable([[5000,6000],[10000,11500],[15000,16000],[20000,21000],[25000,26000],[30000,31000],[50000,51000],[75000,74000],[100000,97000],[150000,147500],[200000,197000]]) },
};

// Operator lengkap = META (identitas) + prefix + tabel pulsa/transfer.
export const OPERATORS = OPERATOR_META.map((o) => ({ ...o, ...OPERATOR_DETAILS[o.id] }));

export const detectOperator = (phone) => OPERATORS.find((o) => o.prefixes.some((p) => phone.startsWith(p))) || null;

export const DATA_PACKAGES = {
  // Tahap 3: tiap operator kini 10 paket — paket lama dipertahankan di urutan
  // awal (sudah ada di frame Figma), paket baru ditambahkan sesudahnya.
  // Keluarga: promo utama (berbagai ukuran), lokal, malam (00.00–07.00),
  // unlimited. Harga contoh mengikuti pola paket lama: harga/GB menurun di
  // ukuran besar, kelipatan Rp1.000 — BUKAN harga final Digiflazz.
  telkomsel: [
    { name: "Internet Sakti 15GB", price: 46000, meta: "Kuota utama 15GB · 30 hari" },
    { name: "Internet Sakti 30GB", price: 69000, meta: "Kuota utama 30GB · 30 hari" },
    { name: "OMG! Nonton 10GB", price: 38000, meta: "Kuota streaming 10GB · 30 hari" },
    { name: "Internet Mingguan 7GB", price: 24000, meta: "Kuota utama 7GB · 7 hari" },
    { name: "GamesMax Booster MLBB", price: 32000, meta: "Kuota game + 30 DM · 30 hari" },
    { name: "Internet Sakti 5GB", price: 18000, meta: "Kuota utama 5GB · 30 hari" },
    { name: "Internet Sakti 60GB", price: 99000, meta: "Kuota utama 60GB · 30 hari" },
    { name: "Internet Lokal 25GB", price: 52000, meta: "Kuota lokal 25GB · 30 hari" },
    { name: "Internet Malam 30GB", price: 29000, meta: "Kuota malam 30GB · 30 hari (00.00–07.00)" },
    { name: "Unlimited Apps 7 Hari", price: 55000, meta: "Kuota utama 5GB + unlimited aplikasi · 7 hari" },
  ],
  // by.U: paket dasar agar lolos syarat pemeriksa (>= 3 paket per operator);
  // Tahap 3 memperluas semua operator ke 10 paket.
  byu: [
    { name: "Kuota by.U 5GB", price: 20000, meta: "Kuota utama 5GB · 30 hari" },
    { name: "Kuota by.U 10GB", price: 35000, meta: "Kuota utama 10GB · 30 hari" },
    { name: "Kuota by.U 20GB", price: 55000, meta: "Kuota utama 20GB · 30 hari" },
    { name: "Kuota by.U 2GB", price: 9000, meta: "Kuota utama 2GB · 7 hari" },
    { name: "Kuota by.U 40GB", price: 85000, meta: "Kuota utama 40GB · 30 hari" },
    { name: "Kuota by.U 100GB", price: 139000, meta: "Kuota utama 100GB · 30 hari" },
    { name: "Kuota Malam by.U 20GB", price: 25000, meta: "Kuota malam 20GB · 30 hari (00.00–07.00)" },
    { name: "Kuota Lokal by.U 15GB", price: 32000, meta: "Kuota lokal 15GB · 30 hari" },
    { name: "Kuota by.U Mingguan 3GB", price: 12000, meta: "Kuota utama 3GB · 7 hari" },
    { name: "Unlimited by.U 30 Hari", price: 99000, meta: "Kuota utama 10GB + unlimited aplikasi · 30 hari" },
  ],
  indosat: [
    { name: "Freedom Internet 16GB", price: 42000, meta: "Kuota utama 16GB · 30 hari" },
    { name: "Freedom Internet 30GB", price: 66000, meta: "Kuota utama 30GB · 30 hari" },
    { name: "Freedom Mini 7GB", price: 23000, meta: "Kuota utama 7GB · 7 hari" },
    { name: "Freedom Internet 5GB", price: 17000, meta: "Kuota utama 5GB · 30 hari" },
    { name: "Freedom Internet 50GB", price: 95000, meta: "Kuota utama 50GB · 30 hari" },
    { name: "Freedom Mini 3GB", price: 12000, meta: "Kuota utama 3GB · 3 hari" },
    { name: "Freedom Malam 25GB", price: 27000, meta: "Kuota malam 25GB · 30 hari (00.00–07.00)" },
    { name: "Freedom Lokal 20GB", price: 45000, meta: "Kuota lokal 20GB · 30 hari" },
    { name: "Freedom Games 10GB", price: 33000, meta: "Kuota game 10GB · 30 hari" },
    { name: "Freedom Unlimited 30 Hari", price: 89000, meta: "Kuota utama 10GB + unlimited aplikasi · 30 hari" },
  ],
  xl: [
    { name: "Xtra Combo 20GB", price: 57000, meta: "Kuota utama 20GB · 30 hari" },
    { name: "Xtra Combo 10GB", price: 38000, meta: "Kuota utama 10GB · 30 hari" },
    { name: "Xtra Harian 3GB", price: 12000, meta: "Kuota utama 3GB · 3 hari" },
    { name: "Xtra Combo 5GB", price: 19000, meta: "Kuota utama 5GB · 30 hari" },
    { name: "Xtra Combo 40GB", price: 89000, meta: "Kuota utama 40GB · 30 hari" },
    { name: "Xtra Combo 100GB", price: 149000, meta: "Kuota utama 100GB · 30 hari" },
    { name: "Xtra Malam 20GB", price: 24000, meta: "Kuota malam 20GB · 30 hari (00.00–07.00)" },
    { name: "Xtra Lokal 15GB", price: 36000, meta: "Kuota lokal 15GB · 30 hari" },
    { name: "Xtra Mingguan 7GB", price: 22000, meta: "Kuota utama 7GB · 7 hari" },
    { name: "Xtra Unlimited 30 Hari", price: 95000, meta: "Kuota utama 10GB + unlimited aplikasi · 30 hari" },
  ],
  axis: [
    { name: "Bronet 8GB", price: 26000, meta: "Kuota utama 8GB · 30 hari" },
    { name: "Bronet 16GB", price: 42000, meta: "Kuota utama 16GB · 30 hari" },
    { name: "Bronet Owsem 32GB", price: 64000, meta: "Kuota utama + kuota aplikasi 32GB · 30 hari" },
    { name: "Bronet 4GB", price: 15000, meta: "Kuota utama 4GB · 30 hari" },
    { name: "Bronet 64GB", price: 99000, meta: "Kuota utama 64GB · 30 hari" },
    { name: "Bronet Owsem 100GB", price: 139000, meta: "Kuota utama + kuota aplikasi 100GB · 30 hari" },
    { name: "Bronet Malam 20GB", price: 23000, meta: "Kuota malam 20GB · 30 hari (00.00–07.00)" },
    { name: "Bronet Lokal 12GB", price: 30000, meta: "Kuota lokal 12GB · 30 hari" },
    { name: "Bronet Mingguan 5GB", price: 18000, meta: "Kuota utama 5GB · 7 hari" },
    { name: "Bronet Unlimited 30 Hari", price: 79000, meta: "Kuota utama 10GB + unlimited aplikasi · 30 hari" },
  ],
  smartfren: [
    { name: "Unlimited Nonstop 12GB", price: 36000, meta: "Kuota utama 12GB, lalu unlimited · 30 hari" },
    { name: "Unlimited Nonstop 30GB", price: 58000, meta: "Kuota utama 30GB, lalu unlimited · 30 hari" },
    { name: "Gokil Max 9GB", price: 24000, meta: "Kuota utama 9GB · 30 hari" },
    { name: "Gokil Max 3GB", price: 12000, meta: "Kuota utama 3GB · 7 hari" },
    { name: "Gokil Max 24GB", price: 52000, meta: "Kuota utama 24GB · 30 hari" },
    { name: "Unlimited Malam 20GB", price: 22000, meta: "Kuota malam 20GB · 30 hari (00.00–07.00)" },
    { name: "Unlimited Lokal 15GB", price: 34000, meta: "Kuota lokal 15GB · 30 hari" },
    { name: "Gokil Max Mingguan 6GB", price: 18000, meta: "Kuota utama 6GB · 7 hari" },
    { name: "Unlimited Nonstop 60GB", price: 89000, meta: "Kuota utama 60GB, lalu unlimited · 30 hari" },
    { name: "Unlimited Nonstop 100GB", price: 129000, meta: "Kuota utama 100GB, lalu unlimited · 30 hari" },
  ],
  tri: [
    { name: "Happy 18GB", price: 43000, meta: "Kuota utama 18GB · 30 hari" },
    { name: "Happy 9GB", price: 28000, meta: "Kuota utama 9GB · 30 hari" },
    { name: "Happy 45GB", price: 72000, meta: "Kuota utama 45GB · 30 hari" },
    { name: "Happy 3GB", price: 11000, meta: "Kuota utama 3GB · 7 hari" },
    { name: "Happy 100GB", price: 129000, meta: "Kuota utama 100GB · 30 hari" },
    { name: "Happy Malam 20GB", price: 24000, meta: "Kuota malam 20GB · 30 hari (00.00–07.00)" },
    { name: "Happy Lokal 15GB", price: 33000, meta: "Kuota lokal 15GB · 30 hari" },
    { name: "Happy Mingguan 6GB", price: 19000, meta: "Kuota utama 6GB · 7 hari" },
    { name: "Happy Streaming 12GB", price: 36000, meta: "Kuota streaming 12GB · 30 hari" },
    { name: "Happy Unlimited 30 Hari", price: 85000, meta: "Kuota utama 10GB + unlimited aplikasi · 30 hari" },
  ],
};

export const PLN_ITEMS = [20000, 50000, 100000, 200000, 500000, 1000000].map((n) => ({
  name: "Token " + n.toLocaleString("id-ID"), price: n + PLN_ADMIN, meta: "Harga token " + rp(n) + " + admin Rp2.500", tokenValue: n,
}));

// Pascabayar (Tahap 4): kategori tagihan bulanan. Harga contoh mengikuti pola
// PLN: tagihan + admin Rp2.500 (sama seperti token PLN: nominal + Rp2.500) —
// BUKAN harga final Digiflazz; tagihan asli tampil setelah backend live.
// `example` adalah nomor contoh yang lolos `pattern` (dipakai pemeriksa +
// verifikasi CDP); `bill` adalah rincian tagihan contoh yang tampil sesudah
// "Cek Tagihan" — nama pelanggan dihitung maskName(nomor) seperti PLN.
const BILL_DETAILS = {
  "pln-pascabayar": { idLabel: "ID Pelanggan PLN", idPlaceholder: "11–12 digit, tertera di meteran",
    pattern: /^\d{11,12}$/, example: "543210987654",
    bill: { period: "Oktober 2026", usage: "Pemakaian 142 kWh · R1 / 1300 VA", amount: 187400 } },
  "pdam": { idLabel: "Nomor Pelanggan PDAM", idPlaceholder: "8–12 digit, tertera di tagihan",
    pattern: /^\d{8,12}$/, example: "1234567890",
    bill: { period: "Oktober 2026", usage: "Pemakaian 18 m³", amount: 86500 } },
  "bpjs-kesehatan": { idLabel: "Nomor Kartu BPJS", idPlaceholder: "13 digit nomor kartu peserta",
    pattern: /^\d{13}$/, example: "0001234567890",
    bill: { period: "Oktober 2026", usage: "Kelas 3 · 3 peserta × Rp35.000", amount: 105000 } },
  "telkom": { idLabel: "Nomor Pelanggan Telkom", idPlaceholder: "12 digit nomor pelanggan",
    pattern: /^\d{12}$/, example: "123456789012",
    bill: { period: "Oktober 2026", usage: "Paket 2P 30 Mbps", amount: 275000 } },
  "tv-kabel": { idLabel: "Nomor Pelanggan TV Kabel", idPlaceholder: "8–12 digit nomor pelanggan",
    pattern: /^\d{8,12}$/, example: "1234567890",
    bill: { period: "Oktober 2026", usage: "Paket Basic", amount: 149000 } },
  "multifinance": { idLabel: "Nomor Kontrak", idPlaceholder: "10–16 digit nomor kontrak",
    pattern: /^\d{10,16}$/, example: "1234567890123456",
    bill: { period: "Oktober 2026", usage: "Angsuran ke-8 dari 12", amount: 1250000 } },
  "pbb": { idLabel: "NOP (Nomor Objek Pajak)", idPlaceholder: "18 digit NOP",
    pattern: /^\d{18}$/, example: "123456789012345678",
    bill: { period: "Tahun pajak 2026", usage: "Pajak Bumi dan Bangunan", amount: 125000 } },
};

// Tagihan lengkap = META (identitas + sub) + detail validasi + contoh tagihan.
export const BILLS = BILLS_META.map((b) => ({ ...b, ...BILL_DETAILS[b.id] }));

// Item checkout per tagihan: satu item = tagihan contoh + admin — mengikuti
// pola PLN_ITEMS. Nama membawa periode agar ringkasan/riwayat membedakan
// tagihan tiap bulan tanpa perubahan CheckoutShell; meta mengikuti pola
// meta PLN ("Harga token RpX + admin Rp2.500").
export const billItem = (b) => ({
  name: "Tagihan " + b.bill.period,
  price: b.bill.amount + BILL_ADMIN,
  meta: "Tagihan " + rp(b.bill.amount) + " + admin Rp2.500",
});

export const EMONEY_ITEMS = [
  { name: "Saldo 10.000", price: 10292 }, { name: "Saldo 20.000", price: 20492 },
  { name: "Saldo 25.000", price: 25492 }, { name: "Saldo 50.000", price: 51092 },
  { name: "Saldo 75.000", price: 75742 }, { name: "Saldo 100.000", price: 99942 },
  { name: "Saldo 150.000", price: 150792 }, { name: "Saldo 200.000", price: 200692 },
  { name: "Saldo 500.000", price: 501092 },
].map((i) => ({ ...i, meta: "Biaya admin sudah termasuk" }));
