// Probe read-only Siklus 430 (ide bank 30): audit hijau status sukses.
// Untuk tiap frame bernama *Sukses* atau *Cek Transaksi* (mobile + desktop):
// - teks status (Berhasil/Selesai/Diproses/Pesanan diterima/Item terkirim/Proses)
//   beserta warna fill teksnya (hex)
// - semua node ber-fill hijau (g dominan) beserta nama, tipe, dan hex fill/stroke
// Bandingkan Light vs Dark dengan token kode: --green #059669 / #34D399,
// --green-soft #ECFDF5 / #0C2B21.
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
function isGreen(c) {
  return c.g > 0.25 && c.g > c.r + 0.08 && c.g > c.b + 0.02;
}
function solidHexes(node, key) {
  const out = [];
  const arr = node[key];
  if (!Array.isArray(arr)) return out;
  for (const p of arr) {
    if (p && p.type === "SOLID" && p.color) out.push(hex(p.color));
  }
  return out;
}

const page = figma.currentPage;
const frames = page.children.filter(
  (n) => n.type === "FRAME" && /Sukses|Cek Transaksi/i.test(n.name)
);
const out = [];
for (const f of frames) {
  const statusTexts = [];
  const greenNodes = [];
  const all = f.findAll(() => true);
  for (const n of all) {
    if (n.type === "TEXT" && /Berhasil|Selesai|Diproses|Pesanan diterima|Item terkirim|Proses/i.test(n.characters)) {
      statusTexts.push({
        id: n.id, name: n.name, chars: n.characters,
        fill: solidHexes(n, "fills"), size: n.fontSize,
      });
    }
    const fills = solidHexes(n, "fills").filter((h) => {
      const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
      return isGreen({ r, g, b });
    });
    const strokes = solidHexes(n, "strokes").filter((h) => {
      const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
      return isGreen({ r, g, b });
    });
    if (fills.length || strokes.length) {
      greenNodes.push({ id: n.id, name: n.name, type: n.type, fills, strokes });
    }
  }
  out.push({ frame: f.name, id: f.id, x: f.x, y: f.y, w: f.width, h: f.height, statusTexts, greenNodes });
}
return { frameCount: out.length, frames: out };
