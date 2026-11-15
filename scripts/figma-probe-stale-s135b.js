// Probe read-only Siklus 135b: cari judul seksi util mobile berdasarkan isi teks.
const out = [];
const FRAMES = ["1:2", "1:105", "10:2", "10:105", "13:2", "13:111", "162:2", "162:111"];
for (const fid of FRAMES) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { out.push({ id: fid, error: "hilang" }); continue; }
  const texts = f.findAll((n) => n.type === "TEXT");
  const head = texts
    .filter((n) => n.characters.indexOf("Pulsa, Data") === 0)
    .map((n) => ({ id: n.id, name: n.name, chars: n.characters, x: n.x, y: n.y, w: n.width, h: n.height }));
  out.push({ id: fid, name: f.name, head });
}
return out;
