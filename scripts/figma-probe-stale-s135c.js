// Probe read-only Siklus 135c: scan SELURUH file untuk sisa teks kedaluwarsa:
// judul util lama "Pulsa, Data, PLN & E-Wallet" dan body S&K lama (tanpa
// "nomor tagihan"). Hanya kembalikan yang cocok — return kecil.
const out = [];
for (const frame of figma.currentPage.children) {
  const hits = [];
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    if (t.characters === "Pulsa, Data, PLN & E-Wallet") hits.push(["headOld", t.id]);
    if (t.characters.indexOf("Semua pesanan diproses") === 0 && t.characters.indexOf("nomor tagihan") < 0) hits.push(["skOld", t.id]);
    if (t.characters.indexOf("Pulsa, Data, PLN & E-Wallet") === 0 && t.characters.length > 27) hits.push(["headMixed", t.id, t.characters.slice(0, 60)]);
  }
  if (hits.length) out.push([frame.id, frame.name, hits]);
}
return { framesWithStale: out.length, frames: out };
