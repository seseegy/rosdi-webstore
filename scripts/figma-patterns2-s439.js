// Read-only audit s439 lanjutan: nilai DISTINCT per pola kunci di seluruh file.
// Dedup berdasarkan isi teks agar return kecil: {key: {value: {count, frames[]}}}.
const PATS = [
  ["mulaiRp", /Mulai Rp[\d.]+/],
  ["gb", /\d+\s?GB/],
  ["durasi", /\d+ (hari|jam)/],
  ["countdown", /\d{2}:\d{2}:\d{2}/],
  ["token20", /(\d{4} ){3}\d{4}|\d{20}/],
  ["tarif", /R\d[MA]? \/ \d+ VA/],
  ["viaUid", /Via UID.*/],
  ["pulsaReguler", /Pulsa reguler.*/],
  ["tokenRp", /Token Rp[\d.]+|Harga token.*/],
  ["saldoNom", /Saldo [\d.]+/],
  ["kodeEmail", /Kode dikirim ke email/],
  ["adminTermasuk", /Biaya admin sudah termasuk/],
  ["hitunganDetik", /masuk dalam hitungan detik.*/],
  ["namaPelanggan", /Nama pelanggan.*/],
  ["tanggal", /\d{2}\/\d{2}\/\d{4}[^,\n]*/],
  ["flashBadge", /-\d+%/],
  ["bonusMeta", /\d+ \+ \d+ bonus/],
  ["demoHp", /08[\d][\d -]{7,}/],
  ["demoPln", /5\d{10,11}/],
  ["refFig", /RSD-[A-Z0-9]+/],
  ["gbSlash", /\d+GB\/\d+ hari|\d+ GB\/\d+ hari/],
  ["qtyStok", /Stok tersedia.*/],
  ["terjual", /Terjual \d+%/],
];
const out = {};
for (const [k] of PATS) out[k] = {};
for (const f of figma.currentPage.children.filter((n) => n.type === "FRAME")) {
  for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
    const c = t.characters;
    if (!c) continue;
    for (const [key, re] of PATS) {
      const m = c.match(re);
      if (m) {
        const v = m[0].slice(0, 90);
        const e = out[key][v] || (out[key][v] = { count: 0, frames: [] });
        e.count++;
        if (e.frames.length < 6 && !e.frames.includes(f.name)) e.frames.push(f.name);
      }
    }
  }
}
return out;
