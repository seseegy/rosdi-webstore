// Probe Siklus 75: cari semua teks "Top Up Game" + simpul di y 280-900 (read-only).
const FRAME_ID = "__FRAME__";
const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const out = [];
const texts = f.findAllWithCriteria({ types: ["TEXT"] });
for (const t of texts) {
  if (t.characters === "Top Up Game" || (t.characters || "").startsWith("Harga mulai dari")) {
    out.push({ chars: t.characters.slice(0, 44), x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height), name: t.name.slice(0, 40) });
  }
}
const mid = [];
const walk = (n) => {
  if (n.y >= 280 && n.y < 900 && n !== f) {
    const o = { t: n.type, name: (n.name || "").slice(0, 36), x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) };
    if (n.type === "TEXT") o.chars = (n.characters || "").slice(0, 36);
    mid.push(o);
  }
  if ("children" in n) for (const c of n.children) walk(c);
};
walk(f);
mid.sort((a, b) => a.y - b.y || a.x - b.x);
return { frame: f.name, h: Math.round(f.height), tug: out, count: mid.length, nodes: mid };
