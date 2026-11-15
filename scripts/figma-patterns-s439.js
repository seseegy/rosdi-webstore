// Read-only audit s439: pola teks spesifik per rentang frame (slice __FROM__..__TO__).
// Mengumpulkan teks yang cocok dengan pola-pola yang dibutuhkan ide batch s439
// (format angka, nama produk, meta, nilai demo, badge) — hanya yang cocok,
// agar return tetap di bawah batas 48KB.
const FROM = __FROM__;
const TO = __TO__;
const PATTERNS = [
  ["mulaiRp", /Mulai Rp/],
  ["operatorTerdeteksi", /Operator terdeteksi/],
  ["cekNama", /Cek Nama/],
  ["cekTagihan", /Cek Tagihan/],
  ["kodeEmail", /Kode dikirim ke email/],
  ["adminTermasuk", /Biaya admin sudah termasuk/],
  ["hitunganDetik", /hitungan detik/],
  ["tarifR", /R1 \/ \d+ VA|R2 \/ \d+ VA|R1M \/ \d+ VA/],
  ["maskNama", /\*[A-Z*]{2,}/],
  ["terlaris", /Terlaris/],
  ["terjual", /Terjual \d+%/],
  ["diskonPersen", /-\d+%/],
  ["stokTersedia", /Stok tersedia/],
  ["bonusMeta", /\d+ \+ \d+ bonus/],
  ["gbMeta", /\d+GB/],
  ["gbSpasi", /\d+ GB/],
  ["durasi", /\d+ hari|\d+ jam|30 hari|7 hari/],
  ["countdown", /\d{2}:\d{2}:\d{2}/],
  ["token20", /(\d{4} ){4}\d{4}|\d{20}/],
  ["viaUid", /Via UID/],
  ["pulsaReguler", /Pulsa reguler/],
  ["tokenRp", /Token Rp|Harga token/],
  ["saldoNominal", /Saldo \d/],
  ["demoHp", /081234567890|0812-3456-7890|08\d{3}[- ]\d{4}[- ]\d{4}/],
  ["demoEmail", /nama@email\.com|[a-z]+@[a-z]+\.com/],
  ["demoUid", /12345678/],
  ["demoPln", /543210987654|51234567890|54321/],
  ["demoRef", /RSD-/],
  ["demoZone", /1234\)|\(1234\)/],
  ["flashSale", /Flash sale|Flash Sale/],
  ["garansi", /uang kembali/],
  ["cs", /CS 24\/7|WhatsApp dan email/],
];
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
const slice = frames.slice(FROM, TO);
const hits = [];
for (const f of slice) {
  for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
    const c = t.characters;
    if (!c) continue;
    for (const [key, re] of PATTERNS) {
      if (re.test(c)) hits.push({ frame: f.name, key, chars: c.slice(0, 100) });
    }
  }
}
return { frameCount: slice.length, hitCount: hits.length, hits: hits.slice(0, 250) };
