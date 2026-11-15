// Probe Figma s465c E59-60 (read-only): dump pohon frame Produk Game mobile untuk ukur kartu nominal & baris metode.
const out = {};
const allFrames = figma.root.findAllWithCriteria({ types: ["FRAME"] }).filter((f) => f.parent && f.parent.type === "PAGE");
const pg = allFrames.find((f) => /Produk Game \(6 Langkah\) — Light/.test(f.name));
if (!pg) { out.produkGameMobile = null; return out; }
const dump = (n, depth, acc) => {
  if (depth > 6) return;
  const hasRp = n.type === "TEXT" ? /Rp[\d.]+/.test(n.characters) : false;
  acc.push({ d: depth, type: n.type, nama: (n.name || "").slice(0, 60), w: Math.round((n.width || 0) * 10) / 10, h: Math.round((n.height || 0) * 10) / 10, teks: n.type === "TEXT" ? n.characters.slice(0, 50) : undefined, rp: hasRp || undefined });
  if (n.children) for (const ch of n.children) dump(ch, depth + 1, acc);
};
const rows = [];
dump(pg, 0, rows);
out.produkGameMobile = { nama: pg.name, id: pg.id, lebar: pg.width, tinggi: pg.height, jumlahNode: rows.length, pohon: rows };
// kandidat kartu nominal: node FRAME/GROUP lebar 150-200 tinggi 50-130 yang memuat teks Rp
const hasRpDesc = (n) => {
  if (n.type === "TEXT" && /Rp[\d.]+/.test(n.characters)) return true;
  if (n.children) return n.children.some(hasRpDesc);
  return false;
};
const collect = (n, acc) => {
  if (n !== pg && n.width >= 140 && n.width <= 210 && n.height >= 40 && n.height <= 140 && hasRpDesc(n)) acc.push({ nama: (n.name || "").slice(0, 50), w: Math.round(n.width * 10) / 10, h: Math.round(n.height * 10) / 10 });
  if (n.children) for (const ch of n.children) collect(ch, acc);
};
const karts = [];
collect(pg, karts);
out.kandidatKartuNominal = karts;
// kandidat baris metode: node lebar 300-390 tinggi 30-90 yang memuat nama metode
const hasMetodeDesc = (n) => {
  if (n.type === "TEXT" && /^(QRIS|GoPay|DANA|OVO|ShopeePay|BCA Virtual Account|Mandiri Virtual Account|BRI Virtual Account|Alfamart|Indomaret|Pulsa Telkomsel|Pulsa XL)$/.test(n.characters.trim())) return true;
  if (n.children) return n.children.some(hasMetodeDesc);
  return false;
};
const collectPay = (n, acc) => {
  if (n !== pg && n.width >= 280 && n.width <= 390 && n.height >= 30 && n.height <= 100 && hasMetodeDesc(n)) acc.push({ nama: (n.name || "").slice(0, 50), w: Math.round(n.width * 10) / 10, h: Math.round(n.height * 10) / 10 });
  if (n.children) for (const ch of n.children) collectPay(ch, acc);
};
const pays = [];
collectPay(pg, pays);
out.kandidatBarisMetode = pays;
return out;
