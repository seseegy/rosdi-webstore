// Diagnostik struktur file s459h (read-only): daftar anak root + frame bernama
// Voucher/E-Wallet/Paket Data/by.U di mana pun + rect Step2Card PLN 30:2.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const out = {};
out.anakRoot = figma.root.children.map((c) => ({ nama: c.name, tipe: c.type, ...box(c) }));
const p12 = F("1:2");
out.parent_1_2 = p12 ? { nama: p12.name, tipe: p12.type, parentNama: p12.parent ? p12.parent.name : null, parentTipe: p12.parent ? p12.parent.type : null, ...box(p12) } : null;
out.cariNama = figma.root.findAll((n) => n.type === "FRAME" && /voucher|e-?wallet|paket data|by\.?u|saldo/i.test(n.name))
  .map((n) => ({ nama: n.name, id: n.id, ...box(n) }));
// E59 ulang: semua RECTANGLE turunan Step2Card di 30:2 (nama apa pun)
{
  const fr = F("30:2");
  const step2 = fr.findAll((n) => n.name === "Step2Card")[0];
  out.e59_semuaRectStep2 = step2 && "findAll" in step2
    ? step2.findAll((n) => n.type === "RECTANGLE").map((n) => ({ nama: n.name, ...box(n) }))
    : [];
  out.e59_step2Ada = !!step2;
}
return out;
