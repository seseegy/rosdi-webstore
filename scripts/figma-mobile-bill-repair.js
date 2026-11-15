// Repair: meta sel tagihan di frame mobile BillPage (311:2 Light, 311:88 Dark)
// dibuat tanpa lebar (bug pemanggilan newText: TEXTW mentah, bukan opts),
// sehingga meta 156px meluber 11px keluar sel 158px dan harga duduk 11px
// terlalu tinggi. Perbaikan: beri lebar 132 pada nama/meta/harga, geser
// harga ke bawah meta yang kini 2 baris. Tinggi sel 80 sudah benar.
const IDS = ["311:2", "311:88"];
const out = [];
for (const id of IDS) {
  const frame = await figma.getNodeByIdAsync(id);
  const meta = frame.children.find((n) => n.type === "TEXT" && n.name.indexOf("BillMeta ") === 0);
  const name = frame.children.find((n) => n.type === "TEXT" && n.name.indexOf("BillName ") === 0);
  const price = frame.children.find((n) => n.type === "TEXT" && n.name.indexOf("BillPrice ") === 0);
  const cell = frame.children.find((n) => n.type === "RECTANGLE" && n.name.indexOf("Bill ") === 0);
  if (!meta || !name || !price || !cell) throw new Error("simpul sel tidak ditemukan di " + id);
  for (const t of [name, meta, price]) {
    const segs = t.getStyledTextSegments(["fontName"]);
    for (const s of segs) await figma.loadFontAsync(s.fontName);
    t.textAutoResize = "HEIGHT";
    t.resize(132, t.height);
  }
  const cellTop = cell.y; // x/y anak frame sudah relatif terhadap frame
  price.y = cellTop + 12 + name.height + 1 + meta.height + 6;
  out.push({ id, nameW: name.width, nameH: name.height, metaW: meta.width, metaH: meta.height, priceY: +price.y.toFixed(1), cellH: cell.height, metaRight: +(meta.x + meta.width).toFixed(1), cellRight: +(cell.x + cell.width).toFixed(1) });
}
return out;
