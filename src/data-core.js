// Katalog inti Rosdi Store — modul RINGAN untuk chunk awal.
// Aturan: file ini (dan data-catalog.js) adalah rumah data; App/Home/Header/
// Footer hanya boleh mengimpor dari sini, JANGAN dari ./data.js (barrel) atau
// ./data-catalog.js — supaya data berat (tab nominal, 70 paket data, detail
// tagihan) tidak ikut chunk awal. Satu-satunya sumber kebenaran tiap entri
// tetap di sini (META) + data-catalog.js (detail); check:catalog menjaga
// keduanya tetap sinkron (termasuk string `search` dan token di bawah).
// Katalog Rosdi Store. Harga game/pulsa/e-wallet dijangkar ke harga yang teramati
// pada survei toko pro (Nov 2026); katalog final nanti diganti data Digiflazz.

export const rp = (n) => "Rp" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Warna tile kategori yang tidak punya entri katalog sendiri (pulsa, paket
// data, PLN, tagihan) — satu-satunya rumah warna tile di luar token CSS. Game,
// operator, e-wallet, voucher, dan tagihan membawa `color` di entrinya
// masing-masing; halaman tidak boleh menulis literal hex sendiri (dijaga
// check:tokens). Tile tagihan memakai slate (keluarga token yang sudah ada).
export const CATEGORY_COLORS = { pulsa: "#2563eb", data: "#0284c7", pln: "#0f766e", tagihan: "#475569" };

// Biaya potong pulsa 7% dari harga dasar (s433 ide 87: tadinya literal 0.07
// di dua baris PAYMENTS).
export const PULSA_FEE = 0.07;
export const PAYMENTS = [
  { group: "Rekomendasi", items: [
    { id: "qris", name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", fee: 0 },
  ]},
  { group: "E-Wallet", items: [
    { id: "gopay", name: "GoPay", mark: "GP", desc: "Saldo terpotong otomatis", fee: 250 },
    { id: "dana", name: "DANA", mark: "DN", desc: "Saldo terpotong otomatis", fee: 250 },
    { id: "ovo", name: "OVO", mark: "OV", desc: "Saldo terpotong otomatis", fee: 250 },
    { id: "shopeepay", name: "ShopeePay", mark: "SP", desc: "Saldo terpotong otomatis", fee: 250 },
  ]},
  { group: "Virtual Account", items: [
    { id: "bca", name: "BCA Virtual Account", mark: "BCA", desc: "Cek otomatis", fee: 2500 },
    { id: "mandiri", name: "Mandiri Virtual Account", mark: "MDR", desc: "Cek otomatis", fee: 2500 },
    { id: "bri", name: "BRI Virtual Account", mark: "BRI", desc: "Cek otomatis", fee: 2500 },
    { id: "danamon", name: "Danamon Virtual Account", mark: "DNM", desc: "Cek otomatis", fee: 2500, status: "Lagi perbaikan" },
  ]},
  { group: "Gerai Retail", items: [
    { id: "alfamart", name: "Alfamart", mark: "ALF", desc: "Bayar di kasir", fee: 2500 },
    { id: "indomaret", name: "Indomaret", mark: "IDM", desc: "Bayar di kasir", fee: 2500 },
  ]},
  { group: "Pulsa", items: [
    { id: "pulsa-tsel", name: "Pulsa Telkomsel", mark: "TS", desc: "Potong pulsa nomor tujuan", feePct: PULSA_FEE },
    { id: "pulsa-xl", name: "Pulsa XL", mark: "XL", desc: "Potong pulsa nomor tujuan", feePct: PULSA_FEE },
  ]},
];
export const ALL_PAYMENTS = PAYMENTS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));
export const payFee = (p, base) => (p.feePct ? Math.round(base * p.feePct) : p.fee || 0);

// Satu-satunya tempat rumus harga checkout hidup: base + fee − diskon.
// Dipakai CheckoutShell untuk ringkasan DAN harga tiap metode bayar, jadi
// keduanya tidak bisa drift walau rumus berubah. promo: { pct, cap } | null.
export const calcTotals = (base, pay, promo) => {
  const fee = pay ? payFee(pay, base) : 0;
  const disc = promo ? Math.min(Math.floor(base * promo.pct), promo.cap) : 0;
  const total = Math.max(0, base + fee - disc);
  return { fee, disc, total };
};

export const PROMOS = {
  ROSDI10: { pct: 0.10, cap: 10000, desc: "Diskon 10% (maks Rp10.000)" },
  GAMER5: { pct: 0.05, cap: 5000, desc: "Diskon 5% (maks Rp5.000)" },
};

// Riot ID: nama game 3–16 karakter + "#" + tag 3–5 alfanumerik
// (format akun Riot: contoh "PlayerOne#TAG12"). Dipakai GamePage untuk
// game riotId; bukan validasi ke server Riot, hanya format penulisan.
export const RIOT_ID_RE = /^[^#\n]{3,16}#[A-Za-z0-9]{3,5}$/;
export const PLN_ADMIN = 2500;
export const BILL_ADMIN = 2500;

export const maskName = (seed) => {
  const names = ["R*SY*D R*M*DH*N*", "S*T* *MIN*H", "B*D* S*NT*S*", "*G*S PR*T*M*"];
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 997;
  return names[h % names.length];
};
export const GAMES_META = [
{
    id: "mobile-legends", name: "Mobile Legends", publisher: "Moonton", initials: "ML", color: "#2563eb",
    tagline: "Top up langsung ke akun", needsZone: true, from: 1650, aka: "MLBB",
    search: "3 diamonds 1650 5 diamonds 1700 12 diamonds 3850 28 diamonds 8950 44 diamonds 13900 59 diamonds 18500 86 diamonds 21580 172 diamonds 43500 257 diamonds 64900 344 diamonds 86500 514 diamonds 129000 706 diamonds 175500 1050 diamonds 262000 2195 diamonds 548000 weekly diamond pass 27900 2x weekly diamond pass 55500 twilight pass 128000",
  },
{
    id: "free-fire", name: "Free Fire", publisher: "Garena", initials: "FF", color: "#0284c7",
    tagline: "Top up langsung ke akun", needsZone: false, from: 1000, aka: "freefire",
    search: "5 diamonds 1000 12 diamonds 1900 50 diamonds 6800 70 diamonds 9450 140 diamonds 18900 355 diamonds 47500 720 diamonds 94000 1450 diamonds 187000 membership mingguan 29000 booyah pass 45000 membership bulanan 89000",
  },
{
    id: "genshin-impact", name: "Genshin Impact", publisher: "HoYoverse", initials: "GI", color: "#0f766e",
    tagline: "Via UID, pilih server", needsZone: false, from: 12500,
    servers: ["Asia", "Amerika", "Eropa", "TW-HK-MO"],
    search: "60 genesis crystals 12500 330 genesis crystals 62000 1090 genesis crystals 189000 2240 genesis crystals 379000 3880 genesis crystals 619000 blessing of the welkin moon 62000",
  },
{
    id: "pubg-mobile", name: "PUBG Mobile", publisher: "Level Infinite", initials: "PB", color: "#334155",
    tagline: "Top up langsung ke akun", needsZone: false, from: 14500,
    search: "60 uc 14500 325 uc 72000 660 uc 144000 1800 uc 379000",
  },
{
    id: "honor-of-kings", name: "Honor of Kings", publisher: "TiMi Studio", initials: "HK", color: "#1e3a8a",
    tagline: "Top up token langsung ke akun", needsZone: false, from: 1500, aka: "HOK",
    search: "16 tokens 1500 80 tokens 7200 240 tokens 21500 400 tokens 35500 800 tokens 71000 2400 tokens 212000 weekly card 14500 weekly card plus 42000",
  },
{
    id: "roblox", name: "Roblox", publisher: "Roblox Corporation", initials: "RB", color: "#334155",
    tagline: "Top up langsung ke akun", needsZone: false, from: 15500,
    search: "80 robux 15500 400 robux 75000 800 robux 149000 1700 robux 299000",
  },
{
    id: "valorant", name: "Valorant", publisher: "Riot Games", initials: "VL", color: "#475569",
    tagline: "Via Riot ID + tag", riotId: true, from: 59000,
    search: "475 points 59000 1000 points 119000 2050 points 239000 3650 points 419000 5350 points 599000 11000 points 1199000",
  },
{
    id: "cod-mobile", name: "Call of Duty: Mobile", publisher: "Garena", initials: "CM", color: "#2563eb",
    tagline: "Top up langsung ke akun", needsZone: false, from: 15000, aka: "CODM COD",
    search: "80 cp 15000 400 cp 75000 800 cp 149000 2000 cp 369000 5000 cp 899000",
  },
{
    id: "wild-rift", name: "League of Legends: Wild Rift", publisher: "Riot Games", initials: "WR", color: "#0284c7",
    tagline: "Via Riot ID + tag", riotId: true, from: 79000, aka: "LOL",
    search: "475 wild cores 79000 1000 wild cores 159000 1850 wild cores 299000 3275 wild cores 499000 5650 wild cores 829000",
  },
{
    id: "arena-of-valor", name: "Arena of Valor", publisher: "Garena", initials: "AV", color: "#0f766e",
    tagline: "Top up langsung ke akun", needsZone: false, from: 15000, aka: "AOV",
    search: "40 vouchers 15000 100 vouchers 31000 230 vouchers 72000 460 vouchers 144000 950 vouchers 289000",
  },
{
    id: "delta-force", name: "Delta Force", publisher: "Garena", initials: "DF", color: "#1e3a8a",
    tagline: "Top up langsung ke akun", needsZone: false, from: 15000,
    search: "60 delta coins 15000 300 delta coins 74000 680 delta coins 164000 1980 delta coins 479000 3280 delta coins 789000",
  },
];

export const OPERATOR_META = [
{ id: "telkomsel", name: "Telkomsel", initials: "TS", color: "#dc2626" },
{ id: "byu", name: "by.U", initials: "BU", color: "#1e3a8a" },
{ id: "indosat", name: "Indosat", initials: "IS", color: "#b45309" },
{ id: "xl", name: "XL", initials: "XL", color: "#2563eb" },
{ id: "axis", name: "Axis", initials: "AX", color: "#7c3aed" },
{ id: "tri", name: "Tri", initials: "3", color: "#0f766e" },
{ id: "smartfren", name: "Smartfren", initials: "SF", color: "#be185d" },
];

export const BILLS_META = [
{ id: "pln-pascabayar", name: "PLN Pascabayar", initials: "LN", color: "#0f766e",
    sub: "Listrik pascabayar bulanan" },
{ id: "pdam", name: "PDAM", initials: "PD", color: "#0284c7",
    sub: "Air bersih bulanan" },
{ id: "bpjs-kesehatan", name: "BPJS Kesehatan", initials: "BP", color: "#1e3a8a",
    sub: "Iuran kesehatan bulanan" },
{ id: "telkom", name: "Telkom / IndiHome", initials: "TI", color: "#dc2626",
    sub: "Internet & telepon rumah" },
{ id: "tv-kabel", name: "TV Kabel", initials: "TV", color: "#7c3aed",
    sub: "Langganan TV bulanan" },
{ id: "multifinance", name: "Multifinance", initials: "MF", color: "#b45309",
    sub: "Cicilan kendaraan & barang" },
{ id: "pbb", name: "PBB", initials: "PB", color: "#475569",
    sub: "Pajak bumi dan bangunan" },
];

export const EWALLETS = [
  { id: "dana", name: "Saldo DANA", initials: "DN", color: "#2563eb" },
  { id: "gopay", name: "Saldo GoPay", initials: "GP", color: "#0f766e" },
  { id: "ovo", name: "Saldo OVO", initials: "OV", color: "#4c1d95" },
  { id: "shopeepay", name: "Saldo ShopeePay", initials: "SP", color: "#c2410c" },
];

export const FLASH_SALE = [
  { gameId: "mobile-legends", name: "Weekly Diamond Pass", sub: "Mobile Legends", price: 27900, was: 30900, sold: 68, initials: "ML", color: "#2563eb" },
  { gameId: "free-fire", name: "70 Diamonds", sub: "Free Fire", price: 9450, was: 10500, sold: 81, initials: "FF", color: "#0284c7" },
];

export const VOUCHERS = [
  { id: "google-play", name: "Voucher Google Play", initials: "GP", color: "#0f766e",
    redeem: "Cara redeem: buka Play Store → ketuk foto profil → Pembayaran & langganan → Tukarkan kode voucher → masukkan kode.",
    items: [5000, 10000, 20000, 50000, 100000, 300000].map((n) => ({ name: "Saldo " + n.toLocaleString("id-ID"), price: Math.round(n * 1.1 / 100) * 100, meta: "Kode tampil di halaman sukses · Termasuk markup 10%" })) },
  { id: "steam-wallet", name: "Steam Wallet IDR", initials: "ST", color: "#334155",
    redeem: "Cara redeem: buka aplikasi Steam → menu Games → Activate a Product on Steam → masukkan kode.",
    items: [12000, 45000, 60000, 90000, 120000, 250000, 400000, 600000].map((n) => ({ name: "Steam Wallet " + n.toLocaleString("id-ID"), price: Math.round(n * 1.05 / 100) * 100, meta: "Kode tampil di halaman sukses · Termasuk markup 5%" })) },
  { id: "playstation", name: "PlayStation Network ID", initials: "PS", color: "#1e3a8a",
    redeem: "Cara redeem: buka PlayStation Store → menu ••• → Redeem Codes → masukkan kode.",
    items: [100000, 200000, 400000].map((n) => ({ name: "PSN IDR " + n.toLocaleString("id-ID"), price: Math.round(n * 1.08 / 100) * 100, meta: "Region Indonesia · Termasuk markup 8%" })) },
];

// Token pencarian Beranda (akar s452-1) — dibangkitkan dari data katalog
// oleh scripts/split-data.py; JANGAN edit manual, jalankan ulang script bila
// katalog berubah. check:catalog memverifikasi token-token ini.
export const PULSA_TOKENS = [5000, 10000, 15000, 20000, 25000, 30000, 50000, 75000, 100000, 150000, 200000];
export const PLN_TOKENS = [20000, 22500, 50000, 52500, 100000, 102500, 200000, 202500, 500000, 502500, 1000000, 1002500];
export const DATA_TOKENS = ["2gb", "3gb", "4gb", "5gb", "6gb", "7gb", "8gb", "9gb", "10gb", "12gb", "15gb", "16gb", "18gb", "20gb", "24gb", "25gb", "30gb", "32gb", "40gb", "45gb", "50gb", "60gb", "64gb", "100gb"];
