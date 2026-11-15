// Pass penuh unslop ke Figma: copy hero + placeholder, CaraNum 25->24,
// plus diagnostik cat badge & count-chip (untuk sweep berikutnya).
const frames = figma.currentPage.children.filter(n => n.type === "FRAME");
let h1 = 0, ph = 0, cara = 0;
const badgePaints = {};
const chipPaints = {};
function hex(c) { const h = v => Math.round(v * 255).toString(16).padStart(2, "0"); return "#" + h(c.r) + h(c.g) + h(c.b); }
for (const fr of frames) {
  const texts = fr.findAll(n => n.type === "TEXT");
  for (const t of texts) {
    if (t.characters === "Top up termurah, proses instan") { t.characters = "Top up, harga final sejak awal"; h1++; }
    if (t.characters === "Cari game, pulsa, token PLN, e-wallet…" || t.characters === "Cari game, pulsa, token PLN, e-wallet...") { t.characters = "Cari produk"; ph++; }
    // diagnostik badge: teks -10% atau Terlaris -> cat teks + rect di belakangnya
    if (t.characters === "-10%" || t.characters === "Terlaris") {
      const tf = Array.isArray(t.fills) && t.fills[0] && t.fills[0].type === "SOLID" ? hex(t.fills[0].color) : "?";
      const bb = t.absoluteBoundingBox;
      let rectHex = "none";
      if (bb) {
        const rects = fr.findAll(n => n.type === "RECTANGLE");
        for (const r of rects) {
          const rb = r.absoluteBoundingBox;
          if (rb && bb.x >= rb.x - 1 && bb.y >= rb.y - 1 && bb.x + bb.width <= rb.x + rb.width + 1 && bb.y + bb.height <= rb.y + rb.height + 1 && Array.isArray(r.fills) && r.fills[0] && r.fills[0].type === "SOLID") rectHex = hex(r.fills[0].color) + " " + Math.round(rb.width) + "x" + Math.round(rb.height);
        }
      }
      const k = t.characters + " text=" + tf + " rect=" + rectHex;
      badgePaints[k] = (badgePaints[k] || 0) + 1;
    }
    if (t.characters.startsWith("Berakhir")) {
      const tf = Array.isArray(t.fills) && t.fills[0] && t.fills[0].type === "SOLID" ? hex(t.fills[0].color) : "?";
      const bb = t.absoluteBoundingBox;
      let rectHex = "none";
      if (bb) {
        const rects = fr.findAll(n => n.type === "RECTANGLE");
        for (const r of rects) {
          const rb = r.absoluteBoundingBox;
          if (rb && bb.x >= rb.x - 1 && bb.y >= rb.y - 1 && bb.x + bb.width <= rb.x + rb.width + 1 && bb.y + bb.height <= rb.y + rb.height + 1 && Array.isArray(r.fills) && r.fills[0] && r.fills[0].type === "SOLID") rectHex = hex(r.fills[0].color) + " " + Math.round(rb.width) + "x" + Math.round(rb.height);
        }
      }
      const k = "chip text=" + tf + " rect=" + rectHex;
      chipPaints[k] = (chipPaints[k] || 0) + 1;
    }
  }
  const els = fr.findAll(n => n.type === "ELLIPSE" && n.name.startsWith("CaraNum") && Math.round(n.width) === 25);
  for (const e of els) { const cx = e.x + e.width / 2, cy = e.y + e.height / 2; e.resize(24, 24); e.x = cx - 12; e.y = cy - 12; cara++; }
}
return { h1, ph, cara, badgePaints, chipPaints };
