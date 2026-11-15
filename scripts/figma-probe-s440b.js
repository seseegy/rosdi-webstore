// Read-only audit s440 (bagian B): akronim, grup metode, total, diskon,
// label pembayaran, catatan hijau (dengan warna fill teks).
const PATTERNS = {
  qrisVar: /Qris|qris|QRIS/,
  vaWord: /\bVA\b/,
  vaSmall: /\bVa\b/,
  uidVar: /\bUID\b|\bUid\b/,
  virtualAccount: /Virtual Account/,
  gerai: /Gerai/,
  minimarket: /Minimarket/,
  retail: /Retail/i,
  totalBayar: /Total Bayar|Total Pembayaran|Total dibayar/,
  totalWord: /^Total$/,
  diskon: /Diskon/i,
  promoWord: /Promo/i,
  pilihPembayaran: /Pilih Pembayaran/,
  metodePembayaran: /Metode Pembayaran/,
  operatorTerdeteksi: /Operator terdeteksi/,
  namaPelanggan: /Nama pelanggan/,
  cekNama: /Cek Nama|Cek Tagihan|Cek ID/,
  cekLacak: /\bLacak\b/,
  cekButton: /^Cek$/,
  ringkasan: /Ringkasan/,
  pembayaranRow: /^Pembayaran$/,
  biayaLayanan: /Biaya layanan|Biaya admin|Biaya pembayaran/,
  ewalletLabel: /E-Wallet/,
  pulsaDataChip: /Pulsa & Data/,
  tagihanChip: /Tagihan/,
};
function fillHex(t) {
  try {
    const f = (t.fills || []).find((x) => x.type === "SOLID" && x.visible !== false);
    if (!f) return null;
    const c = f.color;
    const h = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
    return "#" + h(c.r) + h(c.g) + h(c.b);
  } catch { return null; }
}
const out = {};
for (const k of Object.keys(PATTERNS)) out[k] = { count: 0, frames: {}, samples: [] };
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    const s = t.characters;
    for (const k of Object.keys(PATTERNS)) {
      if (PATTERNS[k].test(s)) {
        out[k].count++;
        out[k].frames[f.name] = (out[k].frames[f.name] || 0) + 1;
        if (out[k].samples.length < 5) out[k].samples.push({ frame: f.name, chars: s.slice(0, 60), fill: fillHex(t) });
      }
    }
  }
}
return { part: "B", patterns: out, frameCount: frames.length };
