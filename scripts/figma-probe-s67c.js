// Probe read-only Siklus 67c: daftar semua teks di seksi bawah Beranda mobile (1:2),
// y 790..1240 — untuk memastikan isi seksi "Pulsa, Data & PLN" vs kode saat ini
// (Home.jsx merender 10 kartu: 3 kategori + 3 voucher + 4 e-wallet).
const f = await figma.getNodeByIdAsync("1:2");
if (!f) return { error: "frame 1:2 tidak ditemukan" };
const texts = f.findAllWithCriteria({ types: ["TEXT"] })
  .filter((t) => t.y >= 790 && t.y <= 1240)
  .map((t) => ({ chars: (t.characters || "").slice(0, 50), x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height), fs: t.fontSize }))
  .sort((a, b) => a.y - b.y || a.x - b.x);
return { frame: f.name, h: Math.round(f.height), count: texts.length, texts };
