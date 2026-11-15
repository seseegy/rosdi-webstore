// Pass Detail unslop ke Figma: badge jadi tint tenang + count-chip tanpa pil.
// Target: teks "-10%"/"Terlaris" (badge) dan "Berakhir*" (count-chip).
// Backer = rect terkecil yang memuat bbox teks (hindari rect frame raksasa).
const frames = figma.currentPage.children.filter(n => n.type === "FRAME");
function hex(c) { const h = v => Math.round(v * 255).toString(16).padStart(2, "0"); return "#" + h(c.r) + h(c.g) + h(c.b); }
function rgb(hx) { return { r: parseInt(hx.slice(1, 3), 16) / 255, g: parseInt(hx.slice(3, 5), 16) / 255, b: parseInt(hx.slice(5, 7), 16) / 255 }; }
function solid(node, hx) { node.fills = [{ type: "SOLID", color: rgb(hx) }]; }
function backerOf(fr, t) {
  const bb = t.absoluteBoundingBox; if (!bb) return null;
  let best = null, bestArea = Infinity;
  for (const r of fr.findAll(n => n.type === "RECTANGLE")) {
    const rb = r.absoluteBoundingBox; if (!rb) continue;
    if (bb.x >= rb.x - 1 && bb.y >= rb.y - 1 && bb.x + bb.width <= rb.x + rb.width + 1 && bb.y + bb.height <= rb.y + rb.height + 1) {
      const a = rb.width * rb.height;
      if (a < bestArea && rb.width <= 140 && rb.height <= 30) { best = r; bestArea = a; }
    }
  }
  return best;
}
const MAP = { "#dc2626": ["#fef2f2", "#dc2626"], "#f87171": ["#33161a", "#f87171"], "#059669": ["#ecfdf5", "#059669"], "#34d399": ["#0c2b21", "#34d399"] };
let badges = 0, chips = 0; const missed = [];
for (const fr of frames) {
  const dark = fr.name.includes("Dark");
  for (const t of fr.findAll(n => n.type === "TEXT")) {
    if (t.characters === "-10%" || t.characters === "Terlaris") {
      const b = backerOf(fr, t);
      if (b && Array.isArray(b.fills) && b.fills[0] && b.fills[0].type === "SOLID") {
        const m = MAP[hex(b.fills[0].color)];
        if (m) { solid(b, m[0]); solid(t, m[1]); badges++; } else missed.push(fr.id + " badge " + hex(b.fills[0].color));
      } else missed.push(fr.id + " badge-nobacker");
    }
    if (t.characters.startsWith("Berakhir")) {
      const b = backerOf(fr, t);
      if (b) b.visible = false;
      solid(t, dark ? "#f87171" : "#dc2626");
      chips++;
    }
  }
}
return { badges, chips, missed: missed.slice(0, 10), missedCount: missed.length };
