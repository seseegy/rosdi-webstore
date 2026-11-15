// Probe s432c — read-only: modal S&K/Refund vs DOCS Footer.jsx (G65/G66),
// tombol Tutup (G67), latar modal vs Beranda (G70).
const out = { sk: {}, refund: {}, tutup: {}, modalBg: {} };
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;
const DOCS = {
  sk: "Semua pesanan diproses otomatis setelah pembayaran terkonfirmasi. Pembeli wajib memeriksa User ID, nomor HP, ID pelanggan, dan nomor tagihan sebelum membayar — kesalahan penulisan tujuan di luar tanggung jawab Rosdi Store dan pesanan yang sudah terproses tidak dapat dibatalkan. Harga mengikuti katalog pemasok dan dapat berubah sewaktu-waktu; harga yang berlaku adalah harga saat pesanan dibuat.",
  refund: "Pesanan yang gagal terproses (stok kosong, gangguan pemasok, atau item tidak terkirim) dikembalikan penuh ke metode pembayaran asal, maksimal 1x24 jam sejak status gagal tercatat. Token PLN dan kode voucher yang sudah terbit tidak dapat dibatalkan. Untuk klaim, buka Cek Transaksi dan siapkan nomor transaksimu.",
};
// Cari kartu modal: semua TEXT di bawah anak-anak frame SETELAH veil
// (latar Beranda ada sebelum veil, kartu modal sesudahnya).
const modalTexts = (frame) => {
  const veilIdx = frame.children.findIndex((c) => /veil/i.test(c.name));
  const texts = [];
  const walk = (n) => {
    if (n.type === "TEXT") texts.push(n.characters);
    if ("children" in n) for (const c of n.children) walk(c);
  };
  const start = veilIdx >= 0 ? veilIdx + 1 : 0;
  for (let i = start; i < frame.children.length; i++) walk(frame.children[i]);
  return texts;
};
// G65: S&K mobile + desktop Light
for (const fid of ["10:2", "170:2"]) {
  const f = byId[fid];
  const texts = modalTexts(f);
  out.sk[f.name] = { texts, bodyMatch: texts.some((t) => t === DOCS.sk), bodyLen: texts.map((t) => t.length) };
}
// G66: Refund mobile + desktop Light
for (const fid of ["13:2", "170:492"]) {
  const f = byId[fid];
  const texts = modalTexts(f);
  out.refund[f.name] = { texts, bodyMatch: texts.some((t) => t === DOCS.refund), bodyLen: texts.map((t) => t.length) };
}
// G67: tombol Tutup di keempat frame modal (mobile+desktop, Light saja + Dark mobile)
for (const fid of ["10:2", "10:105", "13:2", "13:111", "170:2", "170:247", "170:492", "170:737"]) {
  const f = byId[fid];
  if (!f) { out.tutup[fid] = "HILANG"; continue; }
  const t = f.findAllWithCriteria({ types: ["TEXT"] }).find((x) => x.characters.trim() === "Tutup");
  if (!t) { out.tutup[f.name] = "TIDAK ADA TEKS Tutup"; continue; }
  const p = t.parent;
  out.tutup[f.name] = { textW: Math.round(t.width), textH: Math.round(t.height), textX: Math.round(t.x), textY: Math.round(t.y), parent: p.name.slice(0, 30), parentW: Math.round(p.width), parentH: Math.round(p.height), parentX: Math.round(p.x), parentY: Math.round(p.y) };
}
// G70: latar modal (sebelum veil) vs Beranda 1:2 — tagline hero, chip, trust
const bgTexts = (frame) => {
  const veil = frame.children.find((c) => /veil/i.test(c.name));
  const idx = veil ? frame.children.indexOf(veil) : frame.children.length;
  const texts = [];
  for (let i = 0; i < idx; i++) {
    const c = frame.children[i];
    if (c.type === "TEXT") texts.push(c.characters);
    else if ("findAllWithCriteria" in c) for (const t of c.findAllWithCriteria({ types: ["TEXT"] })) texts.push(t.characters);
  }
  return texts;
};
const beranda = byId["1:2"].findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim());
for (const fid of ["10:2", "13:2", "10:105", "13:111"]) {
  const f = byId[fid];
  const bg = bgTexts(f);
  const hero = bg.find((t) => /dalam satu tempat/.test(t)) || "TIDAK ADA";
  const chips = bg.filter((t) => ["Semua", "Top Up Game", "Pulsa", "Paket Data", "Token PLN", "Tagihan", "E-Wallet", "Voucher"].includes(t.trim()));
  const trust = bg.filter((t) => ["Proses instan", "Harga transparan", "Garansi uang kembali", "CS 24/7"].includes(t.trim()));
  out.modalBg[f.name] = { hero, chips, trust, heroInBeranda: beranda.includes(hero.trim ? hero.trim() : hero) };
}
return out;
