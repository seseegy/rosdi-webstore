// Read-only: detail teks dalam sel nominal Voucher GP mobile Light (3:118) — Siklus 58.
// Perlu: fontSize + lebar teks nama/harga/meta, warna stroke tiap sel (identifikasi sel terpilih).
const frame = await figma.getNodeByIdAsync("3:118");
const fb = frame.absoluteBoundingBox;
const rel = n => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
const out = [];
for (const id of ["3:136","3:137","3:138","3:139","3:140","3:144","3:148","3:152","3:156"]) {
  const n = await figma.getNodeByIdAsync(id);
  const d = { id: n.id, name: n.name.slice(0, 40), type: n.type, ...rel(n) };
  if (n.type === "TEXT") { d.chars = n.characters; d.fontSize = n.fontSize; d.autoResize = n.textAutoResize; }
  if (n.type === "RECTANGLE") {
    d.strokeW = n.strokeWeight;
    d.strokeColor = n.strokes.length ? { r: +n.strokes[0].color.r.toFixed(3), g: +n.strokes[0].color.g.toFixed(3), b: +n.strokes[0].color.b.toFixed(3) } : null;
    d.fill = n.fills.length ? n.fills[0].color ? { r: +n.fills[0].color.r.toFixed(3), g: +n.fills[0].color.g.toFixed(3), b: +n.fills[0].color.b.toFixed(3) } : n.fills[0].type : null;
  }
  out.push(d);
}
// Judul Langkah 2 + catatan di bawah grid (cek apakah ada catatan langkah 2 di kartu)
const step2note = frame.children.filter(c => c.type === "TEXT" && c.y > 420 && c.y < 466).map(c => ({ id: c.id, chars: c.characters.slice(0, 60), ...rel(c) }));
return { cells: out, step2note };
