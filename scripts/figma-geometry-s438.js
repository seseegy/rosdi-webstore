// Read-only s438 lanjutan: (a) teks lengkap kalimat garansi/bukti/item-masuk
// untuk banding Figma vs kode (ide 56); (b) geometri anak langsung frame
// Beranda + desktop produk untuk ritme vertikal (ide 81–90); (c) hitung nama
// layer generik polos ("Rectangle"/"Frame" tanpa nomor) di frame desktop (ide 60).
const TARGETS = ["Beranda — Light", "Beranda — Desktop — Light", "Produk Game — Desktop — Light", "Pulsa Telkomsel — Desktop — Light", "Token PLN — Desktop — Light", "Saldo DANA — Desktop — Light", "Voucher Google Play — Desktop — Light", "Genshin Impact — Desktop — Light"];
const out = { fullTexts: [], geometry: [], genericPlain: [] };
for (const f of figma.currentPage.children) {
  for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
    const c = t.characters;
    if (c.includes("Bukti pembayaran") || c.startsWith("✓") || c.includes("Item masuk otomatis") || c.includes("Kesalahan penulisan")) {
      out.fullTexts.push({ frame: f.name, chars: c });
    }
  }
  if (TARGETS.includes(f.name)) {
    out.geometry.push({ frame: f.name, children: f.children.map((ch) => ({ name: ch.name.slice(0, 50), y: Math.round(ch.y), h: Math.round(ch.height) })) });
  }
  if (f.name.includes("Desktop")) {
    let plain = 0; const sample = [];
    for (const n of f.findAll(() => true)) {
      if (n.name === "Rectangle" || n.name === "Frame" || n.name === "Ellipse" || n.name === "Vector") { plain++; if (sample.length < 5) sample.push(n.name + " @ " + Math.round(n.y)); }
    }
    out.genericPlain.push({ frame: f.name, plainGeneric: plain, sample });
  }
}
return out;
