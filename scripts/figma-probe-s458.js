// Probe Figma s458 ide 53-64 + teks E65 (read-only).
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const out = {};
// 53: jumlah frame total (discovery sudah: 132) — konfirmasi ulang di sini.
out.i53_frameCount = figma.currentPage.children.filter((n) => n.type === "FRAME").length;

// Helper: kartu langkah dari teks judul langkah.
const stepCard = (frame, headingRe) => {
  const t = frame.findAllWithCriteria({ types: ["TEXT"] }).find((x) => headingRe.test(x.characters.trim()));
  if (!t) return { heading: null };
  let a = t.parent;
  while (a && a !== frame) {
    if (a.type === "FRAME" && a.height >= 60) {
      const dy = t.absoluteBoundingBox.y - a.absoluteBoundingBox.y;
      if (dy >= 8 && dy <= 45) {
        const b = a.absoluteBoundingBox;
        return { heading: t.characters.trim(), y: r1(b.y), h: r1(b.height), w: r1(b.width), bottom: r1(b.y + b.height) };
      }
    }
    a = a.parent;
  }
  return { heading: t.characters.trim(), card: null };
};
const stepGaps = (fid, headings) => {
  const fr = F(fid);
  const cards = headings.map((h) => stepCard(fr, h)).filter((c) => c.y !== undefined);
  cards.sort((a, b) => a.y - b.y);
  const gaps = [];
  for (let i = 0; i + 1 < cards.length; i++) gaps.push({ dari: cards[i].heading, ke: cards[i + 1].heading, gap: r1(cards[i + 1].y - cards[i].bottom) });
  return { cards: cards.map((c) => ({ h: c.heading, y: c.y, hgt: c.h, w: c.w })), gaps };
};
// 54: Voucher Google Play Desktop (33:2) Langkah 4->5
out.i54_gpDesk = stepGaps("33:2", [/Masukkan Email Tujuan/, /Pilih Nominal/, /Pilih Pembayaran/, /Detail Kontak/, /Kode Promo/]);
// 55: Produk Game Desktop MLBB (26:2) Langkah 5->6
out.i55_gameDesk = stepGaps("26:2", [/Masukkan User ID/, /Pilih Nominal/, /Jumlah Pembelian/, /Pilih Pembayaran/, /Detail Kontak/, /Kode Promo/]);
// 56: Pulsa Telkomsel Desktop (28:2) Langkah 3->4
out.i56_tselDesk = stepGaps("28:2", [/Masukkan Nomor HP/, /Pilih Nominal/, /Pilih Pembayaran/, /Detail Kontak/, /Kode Promo/]);
// 57: Token PLN Desktop (30:2) Langkah 2->3
out.i57_plnDesk = stepGaps("30:2", [/Masukkan ID Pelanggan/, /Pilih Nominal/, /Pilih Pembayaran/, /Detail Kontak/, /Kode Promo/]);
// 58: Saldo DANA Desktop (31:2) Langkah 1->2
out.i58_danaDesk = stepGaps("31:2", [/Masukkan Nomor HP/, /Pilih Nominal/, /Pilih Pembayaran/, /Detail Kontak/, /Kode Promo/]);
// 59: Token PLN Desktop (30:2) Langkah 4->5 — pakai hasil i57
out.i59_plnDesk_gaps = out.i57_plnDesk.gaps;

// 60: lebar input Langkah 1 tiap frame Desktop produk.
const inputW = (fid, phRe) => {
  const fr = F(fid);
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => phRe.test(x.characters.trim()));
  if (!t) return { ph: null };
  let a = t.parent;
  while (a && a !== fr) {
    const b = a.absoluteBoundingBox;
    if (b.height >= 40 && b.height <= 54 && b.width > 100) return { ph: t.characters.trim(), w: r1(b.width), h: r1(b.height) };
    a = a.parent;
  }
  return { ph: t.characters.trim(), w: r1(t.absoluteBoundingBox.width) };
};
out.i60_inputW = {
  game26: inputW("26:2", /^12345678$/),
  tsel28: inputW("28:2", /^08x+$/),
  pln30: inputW("30:2", /11–12 digit/),
  dana31: inputW("31:2", /^08x+$/),
  gp33: inputW("33:2", /nama@email\.com/),
};

// 61: lebar baris metode di Produk Game Desktop (26:2).
const rowW = (fr, nameRe) => {
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => nameRe.test(x.characters.trim()));
  if (!t) return { name: null };
  let a = t.parent;
  while (a && a !== fr) {
    const b = a.absoluteBoundingBox;
    if (b.height >= 50 && b.height <= 80 && b.width > 300) return { name: t.characters.trim(), w: r1(b.width), h: r1(b.height) };
    a = a.parent;
  }
  return { name: t.characters.trim(), w: null };
};
{
  const fr = F("26:2");
  const names = ["QRIS", "GoPay", "DANA", "OVO", "ShopeePay", "BCA Virtual Account", "Mandiri Virtual Account", "BRI Virtual Account", "Danamon Virtual Account", "Alfamart", "Indomaret", "Pulsa Telkomsel", "Pulsa XL"];
  out.i61_payRows = names.map((n) => rowW(fr, new RegExp("^" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$")));
}

// 62-64: paket data Indosat/XL/Tri di frame Paket Data mobile (41:2 = Telkomsel).
{
  const fr = F("41:2");
  const all = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim());
  out.i62_64_dataMobile = {
    frameName: fr.name,
    hasFreedom: all.some((t) => /Freedom/.test(t)),
    hasXtra: all.some((t) => /Xtra/.test(t)),
    hasHappy: all.some((t) => /Happy/.test(t)),
    hasByu: all.some((t) => /by\.U/.test(t)),
    packageNames: all.filter((t) => /^(Freedom|Xtra|Happy|Kuota|Internet|OMG|Bronet|Gokil|Unlimited|GamesMax)/.test(t)),
    prices: all.filter((t) => /^Rp[\d.]+$/.test(t)),
  };
}
// 65: cari teks "Saldo masuk" di SELURUH file.
{
  const hits = [];
  for (const fr of figma.currentPage.children.filter((n) => n.type === "FRAME")) {
    for (const t of fr.findAllWithCriteria({ types: ["TEXT"] })) {
      if (/Saldo masuk/i.test(t.characters)) hits.push(fr.name + " :: " + t.characters.trim());
    }
  }
  out.i65_saldoMasuk = hits;
}
return out;
