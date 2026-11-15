// Probe s433a — read-only: isi teks frame mobile kunci (ide 21-30, 25-28).
// Mengembalikan: untuk tiap frame target, daftar semua teks + presence check string kunci.
const TARGETS = {
  "2:2": "Pulsa-Light", "2:116": "PLN-Light", "3:2": "E-Wallet-Light",
  "3:118": "Voucher-Light", "3:236": "Cek-Light", "4:2": "Sukses-Light",
  "77:2": "Sukses-PLN-Light", "317:2": "Sukses-Pascabayar-Light",
  "1:2": "Beranda-Light", "41:2": "PaketData-Light",
  "100:2": "Steam-Light", "105:2": "PSN-Light",
};
const NEEDLES = ["Cek Nama", "Salin", "Salin token", "Salin kode", "Lacak", "Diproses", "Selesai",
  "Detail Kontak", "Kode Promo", "Garansi", "Contoh penulisan", "Cara redeem", "Token akan dikirim",
  "Mulai Rp", "Reguler", "Transfer", "Cek Tagihan", "20 digit", "Kode voucher", "jangan bagikan",
  "Nomor transaksi", "Pesanan diterima", "Transaksi diterima", "Lacak Pesanan"];
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;
const out = {};
for (const [fid, label] of Object.entries(TARGETS)) {
  const f = byId[fid];
  if (!f) { out[label] = "FRAME HILANG"; continue; }
  const texts = f.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
  const hits = {};
  for (const n of NEEDLES) hits[n] = texts.filter((c) => c.includes(n)).length;
  out[label] = { nTexts: texts.length, hits, texts: texts.slice(0, 400) };
}
// Hitung kartu game di Beranda mobile: teks "Mulai Rp" + nama game
const b = byId["1:2"];
if (b) {
  const bt = b.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim());
  out["Beranda-Light"].mulaiRp = bt.filter((c) => /^Mulai Rp/.test(c));
  out["Beranda-Light"].chips = bt.filter((c) => ["Semua", "Top Up Game", "Pulsa", "Paket Data", "Token PLN", "Tagihan", "E-Wallet", "Voucher"].includes(c));
}
return out;
