// Probe Figma batch s453 (ide 59, 61-70). Read-only.
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const F = (id) => figma.getNodeById(id);
const texts = (frame) => frame.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
const findTexts = (frame, re) => frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => re.test(t.characters)).map((t) => t.characters);
const textFill = (frame, re) => {
  const t = frame.findAllWithCriteria({ types: ["TEXT"] }).find((x) => re.test(x.characters));
  if (!t) return null;
  const f = t.fills && t.fills[0];
  return { text: t.characters, fill: f && f.type === "SOLID" ? hex(f.color) : (f ? f.type : null), size: t.fontSize };
};
const out = {};

// 59: harga coret 706 Diamonds (Rp185.000) di 3 frame
out.i59 = {
  mobile: findTexts(F("1:208"), /185\.?000/),
  desktop: findTexts(F("26:2"), /185\.?000/),
  searchMlbb: findTexts(F("15:2"), /185\.?000/),
  names706: {
    mobile: findTexts(F("1:208"), /706 Diamonds/),
    desktop: findTexts(F("26:2"), /706 Diamonds/),
    searchMlbb: findTexts(F("15:2"), /706 Diamonds/),
  },
};

// 61: frame Tagihan — ketujuh kategori vs BILLS di data.js
out.i61 = { texts: texts(F("306:25")).filter((t) => /PLN|PDAM|BPJS|Telkom|IndiHome|TV Kabel|Multifinance|PBB/.test(t)) };

// 62: frame Modal Masuk — isi vs Header.jsx
out.i62 = { texts: texts(F("162:2")).slice(0, 40) };

// 63: frame 404 — TIDAK ADA frame bernama 404 (discovery 132 frame, 0 hit "404"/"error"/"gagal")
out.i63 = { frame404: null, note: "tidak ada frame 404 di file (132 frame, discovery s453)" };

// 64: Indeks Pulsa mobile — 7 kartu operator
out.i64 = { texts: texts(F("54:22")).filter((t) => /Telkomsel|by\.U|Indosat|^XL$|Axis|^Tri$|Smartfren/.test(t)) };

// 65: Indeks Paket Data mobile — jumlah operator
out.i65 = { texts: texts(F("54:158")).filter((t) => /Telkomsel|by\.U|Indosat|^XL$|Axis|^Tri$|Smartfren|Paket Data/.test(t)) };

// 66: Sukses mobile — nomor order + tombol Salin
out.i66 = { ref: findTexts(F("4:2"), /RSD-/), salin: findTexts(F("4:2"), /^Salin$/), texts: texts(F("4:2")).slice(0, 40) };

// 67: Produk Game Desktop — kartu nominal MLBB (14 di tab Diamonds)
out.i67 = { itemNames: texts(F("26:2")).filter((t) => /Diamonds$/.test(t.trim())), count: texts(F("26:2")).filter((t) => /Diamonds$/.test(t.trim())).length };

// 68: Beranda Desktop — progress bar flash "Terjual 68%"/"Terjual 81%"
out.i68 = {
  terjual68: findTexts(F("20:2"), /Terjual 68%/),
  terjual81: findTexts(F("20:2"), /Terjual 81%/),
  progressBars: F("20:2").findAllWithCriteria({ types: ["RECTANGLE"] }).filter((r) => r.name && /progress/i.test(r.name)).map((r) => r.name),
};

// 69: Beranda Desktop — kartu di seksi Pulsa/Data/PLN + E-Wallet + Voucher
out.i69 = { sectionCards: texts(F("20:2")).filter((t) => /^(Pulsa Reguler|Paket Data|Token PLN|Tagihan Pascabayar|Saldo DANA|Saldo GoPay|Saldo OVO|Saldo ShopeePay|Voucher Google Play|Steam Wallet IDR|PlayStation Network ID)$/.test(t.trim())) };

// 70: Token PLN Desktop — peringatan token tak bisa dibatalkan (teks + warna)
out.i70 = { warn: textFill(F("30:2"), /tidak bisa dibatalkan/i), allWarnTexts: findTexts(F("30:2"), /batal/i) };

return out;
