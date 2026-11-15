// Probe susulan s461c (read-only): semua kemunculan teks "Token PLN" di Beranda Light + tile di baris kartu kategori.
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: Math.round(b.y * 10) / 10, h: Math.round(b.height * 10) / 10, w: Math.round(b.width * 10) / 10, x: Math.round(b.x * 10) / 10 } : null; };
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const fr = F("1:2");
const occ = fr.findAllWithCriteria({ types: ["TEXT"] })
  .filter((t) => t.characters.trim() === "Token PLN")
  .map((t) => ({ teks: t.characters, ...box(t), parent: t.parent ? t.parent.name : null }));
const tilesRow = fr.findAll((n) => /tile/i.test(n.name))
  .map((n) => ({ nama: n.name, ...box(n), fills: (n.fills || []).filter((f) => f.type === "SOLID").map((f) => hex(f.color)) }))
  .filter((t) => t.y >= 1830 && t.y <= 1900);
return { frame: fr.name, kemunculanTokenPLN: occ, tileBarisKategori: tilesRow };
