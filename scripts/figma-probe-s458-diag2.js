// Diagnostik 2 (read-only): semua anak langsung frame Desktop — nama + geometri (cari rect kartu langkah, input, baris bayar).
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; };
const out = {};
for (const [key, fid] of [["game26", "26:2"], ["tsel28", "28:2"], ["pln30", "30:2"], ["dana31", "31:2"], ["gp33", "33:2"]]) {
  const fr = F(fid);
  out[key] = fr.children.map((c) => ({ type: c.type, name: c.name, ...box(c) }));
}
return out;
