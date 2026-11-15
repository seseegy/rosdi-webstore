// Discovery Figma batch s449: inventaris semua frame tingkat atas + cari frame
// Pulsa by.U, Paket Data, Sukses mobile, Cek mobile (ide 81-84).
const r1 = (n) => Math.round(n * 10) / 10;
const out = { frames: [], byu: [], data: [], sukses: [], cek: [] };
const walk = (node, depth) => {
  if (node.type === "FRAME" && depth <= 2) {
    out.frames.push({ id: node.id, name: node.name, x: r1(node.x), y: r1(node.y), w: r1(node.width), h: r1(node.height) });
  }
  if (node.children) for (const c of node.children) walk(c, depth + 1);
};
for (const page of figma.root.children) {
  for (const c of page.children) walk(c, 0);
}
const has = (re) => out.frames.filter((f) => re.test(f.name));
out.byu = has(/by\.?u/i);
out.data = has(/paket data|data/i);
out.sukses = has(/sukses/i);
out.cek = has(/cek/i);
return out;
