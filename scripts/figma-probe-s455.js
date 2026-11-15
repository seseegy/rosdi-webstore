// Probe Figma batch s455 (ide 61-70) + cari teks "Berhasil" (H74). Read-only.
const F = (id) => figma.getNodeById(id);
const texts = (frame) => frame.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
const findTexts = (frame, re) => frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => re.test(t.characters)).map((t) => t.characters);
const out = {};

// 61: PUBG Mobile Desktop 90:2 — kartu UC (data.js: 4)
const pubg = F("90:2");
out.i61 = { uc: texts(pubg).filter((t) => /UC$/.test(t.trim())), tabs: findTexts(pubg, /^UC$/) };
// 62: Honor of Kings Desktop 93:2 — kartu Token (data.js: 6)
const hok = F("93:2");
out.i62 = { tokens: texts(hok).filter((t) => /Token$/.test(t.trim())), tabs: findTexts(hok, /^(Token|Weekly Card)$/) };
// 63: Roblox Desktop 95:2 — kartu Robux (data.js: 4)
const rb = F("95:2");
out.i63 = { robux: texts(rb).filter((t) => /Robux$/.test(t.trim())), tabs: findTexts(rb, /^Robux$/) };
// 64: Arena of Valor Desktop 286:2 — kartu Voucher (data.js: 5)
const aov = F("286:2");
out.i64 = { voucher: texts(aov).filter((t) => /Voucher$/.test(t.trim())), tabs: findTexts(aov, /^Voucher$/) };
// 65: Pulsa Indosat Desktop — TIDAK ADA di discovery s454; cek ulang daftar frame
out.i65 = { indosatDesktopFrames: figma.root.findAllWithCriteria({ types: ["FRAME"] }).filter((f) => /Indosat/i.test(f.name) && /Desktop/i.test(f.name)).map((f) => f.name + " (" + f.id + ")"), indosatAnyFrames: figma.root.findAllWithCriteria({ types: ["FRAME"] }).filter((f) => /Indosat/i.test(f.name)).map((f) => f.name + " (" + f.id + ")") };
// 66: Paket Data Telkomsel Desktop 46:2 — kartu paket (data.js: 10 Telkomsel)
const pd = F("46:2");
out.i66 = { title: findTexts(pd, /Paket Data/), operatorNames: findTexts(pd, /Telkomsel|Indosat|XL|by\.U|Axis|Tri|Smartfren/), packageNames: texts(pd).filter((t) => /^(Internet|OMG|GamesMax|Unlimited)/.test(t.trim())) };
// 67: Token PLN Mobile 2:116 — kartu nominal (data.js: 6)
const pln = F("2:116");
out.i67 = { tokens: texts(pln).filter((t) => /^Token [\d.]+$/.test(t.trim())) };
// 68: Voucher Steam Mobile 100:2 — kartu voucher (data.js Steam: 8 item)
const st = F("100:2");
out.i68 = { steam: texts(st).filter((t) => /^Steam Wallet [\d.]+$/.test(t.trim())) };
// 69: Cek Transaksi Desktop 36:2 — daftar "Transaksi terakhir"
const ck = F("36:2");
out.i69 = { heading: findTexts(ck, /Cek Transaksi/), historyHeading: findTexts(ck, /Transaksi terakhir/), historyRows: findTexts(ck, /RSD-/), buttons: findTexts(ck, /^(Lacak|Cek)$/) };
// 70: Sukses Mobile 4:2 — ketiga tombol aksi
const sk = F("4:2");
out.i70 = { actions: texts(sk).filter((t) => /^(Beli Lagi|Unduh struk|Cek Transaksi|Belanja Lagi)$/.test(t.trim())), all: findTexts(sk, /Beli Lagi|Unduh struk|Cek Transaksi|Belanja Lagi/) };
// H74: teks "Berhasil" di frame Cek + Sukses (mobile + desktop)
out.h74 = {
  cekMobile: findTexts(F("3:236"), /Berhasil/),
  cekDesktop: findTexts(F("36:2"), /Berhasil/),
  suksesMobile: findTexts(F("4:2"), /Berhasil/),
  suksesDesktop: findTexts(F("36:166"), /Berhasil/),
  statusTextsCek: findTexts(F("3:236"), /Diproses|Selesai|Berhasil/),
};
return out;
