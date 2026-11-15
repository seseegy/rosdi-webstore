// Siklus 99: probe sel nominal frame Genshin mobile (6:2/6:108) —
// probe sebelumnya menemukan 0 sel 158x54, padahal badge Terlaris ada.
// Cari semua RECTANGLE/FRAME berisi titik pusat badge (333,377).
const jobs = [
  { frameId: "6:2", label: "Genshin Mobile Light" },
  { frameId: "6:108", label: "Genshin Mobile Dark" },
];
const out = [];
for (const j of jobs) {
  const frame = await figma.getNodeByIdAsync(j.frameId);
  const all = frame.findAll(() => true);
  const cx = 333, cy = 377;
  const containers = all.filter((n) => (n.type === "RECTANGLE" || n.type === "FRAME")
    && cx >= n.x && cx <= n.x + n.width && cy >= n.y && cy <= n.y + n.height)
    .map((n) => ({ id: n.id, type: n.type, name: n.name, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) }));
  const h54 = all.filter((n) => (n.type === "RECTANGLE" || n.type === "FRAME") && Math.abs(n.height - 54) < 1)
    .map((n) => ({ id: n.id, type: n.type, name: n.name, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) }));
  out.push({ frame: j.label, containers, h54 });
}
return out;
