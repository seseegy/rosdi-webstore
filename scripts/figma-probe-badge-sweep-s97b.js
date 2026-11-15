// Siklus 97b: sapuan seluruh file — semua rect badge (42x14 / 42x20 / 62x20) + fill-nya.
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
const rows = [];
for (const frame of frames) {
  const rects = frame.findAll((n) => n.type === "RECTANGLE"
    && ((Math.abs(n.width - 42) < 3 && (Math.abs(n.height - 14) < 3 || Math.abs(n.height - 20) < 3))
      || (Math.abs(n.width - 62) < 3 && Math.abs(n.height - 20) < 3)));
  for (const r of rects) {
    const f = (r.fills || [])[0];
    const c = f && f.color ? [+(f.color.r).toFixed(3), +(f.color.g).toFixed(3), +(f.color.b).toFixed(3)].join(",") : "?";
    rows.push({ frame: frame.name, frameId: frame.id, id: r.id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), fill: c });
  }
}
const summary = {};
for (const r of rows) summary[r.fill] = (summary[r.fill] || 0) + 1;
return { total: rows.length, summary, rows };
