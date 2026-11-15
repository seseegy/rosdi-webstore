// Probe Figma batch s454 (ide 61-70, 79, 99). Read-only.
const F = (id) => figma.getNodeById(id);
const texts = (frame) => frame.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
const findTexts = (frame, re) => frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => re.test(t.characters)).map((t) => t.characters);
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const out = {};

// 61: Genshin Desktop 84:2 — kartu nominal (5 Genesis Crystal + 1 Blessing?)
const g = F("84:2");
out.i61 = {
  gc: texts(g).filter((t) => /Genesis Crystal$/.test(t.trim())),
  blessing: findTexts(g, /Blessing of the Welkin Moon/),
  tabs: findTexts(g, /^(Genesis Crystal|Blessing)$/),
};
// 62: Free Fire Desktop 87:2 — 8 Diamonds + 1 Membership Mingguan?
const ff = F("87:2");
out.i62 = {
  diamonds: texts(ff).filter((t) => /Diamonds$/.test(t.trim())),
  membership: findTexts(ff, /Membership Mingguan|Booyah Pass|Membership Bulanan/),
  tabs: findTexts(ff, /^(Diamonds|Membership)$/),
};
// 63: Valorant Desktop 280:2 — 6 Points?
const vl = F("280:2");
out.i63 = {
  points: texts(vl).filter((t) => /Points$/.test(t.trim())),
  tabs: findTexts(vl, /^Points$/),
};
// 64: Indeks E-Wallet Desktop 51:190 — 4 e-wallet?
const ew = F("51:190");
out.i64 = { wallets: texts(ew).filter((t) => /^(Saldo DANA|Saldo GoPay|Saldo OVO|Saldo ShopeePay)$/.test(t.trim())) };
// 65: Voucher — mobile index 3:118 (3 merek?) + 3 frame desktop (judul tiap frame)
const vix = F("3:118");
out.i65 = {
  mobileIndex: texts(vix).filter((t) => /^(Voucher Google Play|Steam Wallet IDR|PlayStation Network ID)$/.test(t.trim())),
  gpDesktopTitle: findTexts(F("33:2"), /Voucher Google Play/),
  steamDesktopTitle: findTexts(F("100:232"), /Steam Wallet IDR/),
  psnDesktopTitle: findTexts(F("105:162"), /PlayStation Network ID/),
};
// 66: Indeks Pulsa Desktop 49:2 — 7 operator?
const pi = F("49:2");
out.i66 = { operators: texts(pi).filter((t) => /^(Telkomsel|by\.U|Indosat|XL|Axis|Tri|Smartfren)$/.test(t.trim())) };
// 67: Indeks Tagihan Desktop 306:156 — 7 kategori?
const tg = F("306:156");
out.i67 = { cats: texts(tg).filter((t) => /^(PLN Pascabayar|PDAM|BPJS Kesehatan|Telkom \/ IndiHome|TV Kabel|Multifinance|PBB)$/.test(t.trim())) };
// 68: Cek Transaksi Mobile 3:236 — input nomor order + tombol Lacak?
const ck = F("3:236");
out.i68 = {
  inputPlaceholder: findTexts(ck, /RSD-|Contoh: RSD/),
  buttons: findTexts(ck, /^(Lacak|Cek)$/),
  heading: findTexts(ck, /Cek Transaksi/),
  allButtons: texts(ck).filter((t) => /^(Lacak|Cek|Lihat semua|Tampilkan lebih sedikit)/.test(t.trim())),
};
// 69: Sukses Desktop 36:166 — ketiga tombol aksi?
const sk = F("36:166");
out.i69 = { actions: texts(sk).filter((t) => /^(Beli Lagi|Unduh struk|Cek Transaksi|Belanja Lagi)$/.test(t.trim())), all: findTexts(sk, /Beli Lagi|Unduh struk|Cek Transaksi|Belanja Lagi/) };
// 70: Beranda Desktop 20:2 vs mobile 1:2 — headline hero
out.i70 = {
  desktopHero: findTexts(F("20:2"), /Top up, harga final/),
  mobileHero: findTexts(F("1:2"), /Top up, harga final/),
};
// 79 + 99: frasa "Harga final, tanpa biaya tambahan" di seluruh file (teks + warna + ukuran)
const phrase = [];
for (const frame of figma.currentPage.children) {
  for (const t of frame.findAllWithCriteria({ types: ["TEXT"] })) {
    if (/Harga final/.test(t.characters)) {
      const f = t.fills && t.fills[0];
      phrase.push({ frame: frame.name, text: t.characters.slice(0, 80), fill: f && f.type === "SOLID" ? hex(f.color) : null, size: t.fontSize });
    }
  }
}
out.i79_99 = phrase;
return out;
