// Probe read-only lanjutan Siklus 430 (ide bank 30): identifikasi 3 hal yang
// belum terjawab probe pertama:
// 1. Node teks "Selesai" 15px di frame Sukses mobile (4:5, 77:5, 317:5):
//    parent-nya apa, posisi/ukuran, dan apakah ada latar pill hijau di baliknya?
// 2. Semua dot timeline di Cek mobile Light (3:236): warna tiap ellipse
//    (probe 1 hanya menemukan 2 hijau dari 3 item timeline).
// 3. Fill hijau-pucat (--green-soft #ECFDF5 / #0C2B21) di ke-16 frame
//    Sukses/Cek — probe 1 melewatkannya karena ambang isGreen terlalu ketat
//    untuk warna pucat (cek lingkaran .big-check & latar badge).
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
function fillsOf(n) {
  const out = [];
  if (Array.isArray(n.fills)) for (const p of n.fills) if (p && p.type === "SOLID" && p.color) out.push(hex(p.color));
  return out;
}
const page = figma.currentPage;
const out = { selesaiNodes: [], cekDots: [], greenSoft: [] };
const mobileSukses = ["4:2", "77:2", "317:2"];
for (const id of mobileSukses) {
  const f = await figma.getNodeByIdAsync(id);
  if (!f) { out.selesaiNodes.push({ frame: id, error: "not found" }); continue; }
  const t = f.findAll((n) => n.type === "TEXT" && n.characters === "Selesai");
  for (const n of t) {
    out.selesaiNodes.push({
      frame: f.name, id: n.id, x: n.x, y: n.y, w: n.width, h: n.height,
      parent: n.parent ? n.parent.name + " (" + n.parent.type + ")" : null,
      parentFills: n.parent ? fillsOf(n.parent) : [],
      parentXYWH: n.parent ? [n.parent.x, n.parent.y, n.parent.width, n.parent.height] : null,
    });
  }
}
const cek = await figma.getNodeByIdAsync("3:236");
if (cek) {
  for (const e of cek.findAll((n) => n.type === "ELLIPSE")) {
    out.cekDots.push({ id: e.id, name: e.name, x: e.x, y: e.y, w: e.width, h: e.height, fills: fillsOf(e) });
  }
}
const frames = page.children.filter(
  (n) => n.type === "FRAME" && /Sukses|Cek Transaksi/i.test(n.name)
);
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    const fs = fillsOf(n);
    if (fs.includes("#ecfdf5") || fs.includes("#0c2b21")) {
      out.greenSoft.push({ frame: f.name, id: n.id, name: n.name, type: n.type, fills: fs });
    }
  }
}
return out;
