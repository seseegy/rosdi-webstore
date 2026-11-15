// Probe susulan s461d (read-only): semua tile + teks nama kartu di seksi kategori Beranda Light (y 1750-2200).
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: Math.round(b.y * 10) / 10, h: Math.round(b.height * 10) / 10, w: Math.round(b.width * 10) / 10, x: Math.round(b.x * 10) / 10 } : null; };
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const fr = F("1:2");
const tiles = fr.findAll((n) => /tile/i.test(n.name))
  .map((n) => ({ nama: n.name, ...box(n), fills: (n.fills || []).filter((f) => f.type === "SOLID").map((f) => hex(f.color)) }))
  .filter((t) => t.y >= 1750 && t.y <= 2200)
  .sort((a, b) => (a.y - b.y) || (a.x - b.x));
const names = fr.findAllWithCriteria({ types: ["TEXT"] })
  .filter((t) => ["Pulsa Reguler", "Paket Data", "Token PLN", "Tagihan Pascabayar", "Saldo DANA", "Saldo GoPay", "Saldo OVO", "Saldo ShopeePay", "Voucher Google Play", "Steam Wallet IDR", "PlayStation Network ID"].includes(t.characters.trim()))
  .map((t) => ({ teks: t.characters, ...box(t) }))
  .filter((t) => t.y >= 1750 && t.y <= 2200)
  .sort((a, b) => (a.y - b.y) || (a.x - b.x));
return { frame: fr.name, tiles, names };
