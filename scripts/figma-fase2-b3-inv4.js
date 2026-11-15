// Inventaris B3-4 — read-only: geometri sekitar "Cek ID" (1:215), chip
// "Pulsa & Data" (1:23), dan baris chip Beranda mobile (1:2) — cari
// background tombol/chip (rect/frame yang membungkus teks).
const out = {};
const near = (node, pad = 12) => {
  const b = node.absoluteBoundingBox;
  const fr = node.parent;
  return fr.children.filter((c) => {
    if (c === node) return false;
    const cb = c.absoluteBoundingBox;
    if (!cb) return false;
    return cb.x <= b.x + b.width + pad && cb.x + cb.width >= b.x - pad &&
      cb.y <= b.y + b.height + pad && cb.y + cb.height >= b.y - pad;
  }).map((c) => ({ name: c.name, type: c.type, id: c.id,
    x: Math.round(c.absoluteBoundingBox.x - fr.absoluteBoundingBox.x),
    y: Math.round(c.absoluteBoundingBox.y - fr.absoluteBoundingBox.y),
    w: Math.round(c.width), h: Math.round(c.height) }));
};
const cek = figma.getNodeById("1:215");
out.cekID = { text: cek.characters, x: Math.round(cek.x), y: Math.round(cek.y), w: Math.round(cek.width), h: Math.round(cek.height), near: near(cek) };
const chip = figma.getNodeById("1:23");
out.pulsaDataChip = { text: chip.characters, x: Math.round(chip.x), y: Math.round(chip.y), w: Math.round(chip.width), h: Math.round(chip.height), near: near(chip) };
// Semua chip Beranda mobile 1:2 (teks + geometri + tetangga dekat)
{
  const fr = figma.getNodeById("1:2");
  const names = ["Semua", "Top Up Game", "Pulsa & Data", "Token PLN", "E-Wallet", "Voucher"];
  out.chipsMobile = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => names.includes(t.characters.trim())).map((t) => ({
    text: t.characters, id: t.id, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height),
    near: near(t).map((n) => n.name + " [" + n.type + "] " + n.w + "x" + n.h + " @" + n.x + "," + n.y),
  }));
}
// Tautan footer Produk di Beranda Desktop 20:2 + judul kolomnya
{
  const fr = figma.getNodeById("20:2");
  const names = ["Mobile Legends", "Free Fire", "Pulsa Reguler", "Token PLN", "Produk"];
  out.footerLinks = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => names.includes(t.characters.trim())).map((t) => ({
    text: t.characters, id: t.id, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height),
    near: near(t).map((n) => n.name + " [" + n.type + "] " + n.w + "x" + n.h + " @" + n.x + "," + n.y),
  }));
  // deskripsi footer
  const desc = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes("Toko top up game"));
  out.footerDesc = desc.map((t) => ({ id: t.id, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) }));
}
return out;
