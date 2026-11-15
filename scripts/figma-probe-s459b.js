// Probe Figma s459 lanjutan (read-only): lebar kartu nominal via node penampung terkecil,
// isi penuh frame Voucher mobile 3:118 & E-Wallet mobile 3:2, hitung Terlaris per frame.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const contains = (outer, inner) => outer.x <= inner.x + 0.5 && outer.y <= inner.y + 0.5
  && (outer.x + outer.w) >= (inner.x + inner.w) - 0.5 && (outer.y + outer.h) >= (inner.y + inner.h) - 0.5;
const out = {};

// E53 per frame: naik sampai induk bertipe PAGE
{
  const hits = {};
  const allText = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.trim() === "Terlaris");
  for (const t of allText) {
    let p = t.parent, frameName = "?";
    while (p) { if (p.parent && p.parent.type === "PAGE") { frameName = p.name; break; } p = p.parent; }
    hits[frameName] = (hits[frameName] || 0) + 1;
  }
  out.e53_perFrame = hits;
}

// E58/E59: kartu nominal = node terkecil (berdasarkan luas) yang memuat kotak teks
function cardWidths(frameId, re) {
  const fr = F(frameId);
  const kids = fr.findAll((n) => (n.type === "RECT" || n.type === "FRAME" || n.type === "GROUP" || n.type === "COMPONENT" || n.type === "INSTANCE") && n.absoluteBoundingBox);
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => re.test(t.characters.trim()));
  return texts.map((t) => {
    const tb = box(t);
    const holders = kids.map((k) => ({ nama: k.name, tipe: k.type, ...box(k) }))
      .filter((k) => k.w && contains(k, tb) && k.w < 1280)
      .sort((a, b) => (a.w * a.h) - (b.w * b.h));
    return { teks: t.characters.trim(), kotakTeks: tb, kartuTerkecil: holders[0] || null, jumlahPenampung: holders.length };
  });
}
out.e58_cards = cardWidths("28:2", /^Pulsa [\d.]+$/);
out.e59_cards = cardWidths("30:2", /^Token [\d.]+$/);

// E60/E61: seluruh teks frame mobile
out.e60_allTexts = F("3:118").findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
out.e61_allTexts = F("3:2").findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
return out;
