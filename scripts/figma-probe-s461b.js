// Probe susulan s461 (read-only): E54 lebar kartu nominal Genshin Desktop,
// E63 baris metode Pulsa Desktop, E64 warna tile Beranda (per label, tile terdekat).
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const out = {};

// E54b: semua node di pita y Step2Card Genshin Desktop 84:2 (37838..38154)
{
  const fr = F("84:2");
  const nodes = fr.findAll((n) => {
    const b = n.absoluteBoundingBox;
    return b && b.y >= 37830 && b.y < 38160;
  }).map((n) => ({ nama: n.name, tipe: n.type, ...box(n) }))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));
  out.e54b = { frame: fr.name, jumlah: nodes.length, nodes };
}

// E63b: semua node di pita y Step3Card Pulsa Desktop 28:2 (16064..17062)
{
  const fr = F("28:2");
  const nodes = fr.findAll((n) => {
    const b = n.absoluteBoundingBox;
    return b && b.y >= 16060 && b.y < 17070;
  }).map((n) => ({ nama: n.name, tipe: n.type, ...box(n) }))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));
  out.e63b = { frame: fr.name, jumlah: nodes.length, nodes };
}

// E64b: semua tile di Beranda Light 1:2 + teks label kartu + pasangan terdekat
{
  const fr = F("1:2");
  const tiles = fr.findAll((n) => /tile/i.test(n.name)).map((n) => {
    const fills = (n.fills || []).filter((f) => f.type === "SOLID").map((f) => hex(f.color));
    return { nama: n.name, ...box(n), fills };
  });
  const labels = ["Pulsa Reguler", "Paket Data", "Token PLN", "Tagihan Pascabayar", "Saldo DANA", "Saldo GoPay", "Saldo OVO", "Saldo ShopeePay", "Voucher Google Play", "Steam Wallet IDR", "PlayStation Network ID"];
  const pairs = labels.map((label) => {
    const hits = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.trim() === label);
    if (!hits.length) return { label, ditemukan: false };
    const tb = hits[0].absoluteBoundingBox;
    // tile terdekat: baris sama (|dy| kecil) dan di kiri teks
    let best = null, bestD = 1e9;
    for (const t of tiles) {
      const d = Math.abs((t.y + t.h / 2) - (tb.y + tb.height / 2)) + Math.max(0, tb.x - (t.x + t.w)) * 0.01;
      if (d < bestD) { bestD = d; best = t; }
    }
    return { label, teksBox: box(hits[0]), tileTerdekat: best, jarak: Math.round(bestD * 10) / 10 };
  });
  out.e64b = { frame: fr.name, jumlahTile: tiles.length, tiles, pairs };
}

return out;
