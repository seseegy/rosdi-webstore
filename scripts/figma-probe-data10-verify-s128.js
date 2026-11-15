// Probe read-only Siklus 128: verifikasi pasca-fix frame Dark — tinggi frame,
// jumlah sel paket, dan posisi kartu Langkah 3 (pastikan tidak ada duplikat
// akibat driver dark yang sempat jalan 2x).
const IDS = ["41:94", "46:235", "54:226", "51:96"];
const out = [];
for (const id of IDS) {
  const f = figma.getNodeById(id);
  if (!f) { out.push({ id, error: "tidak ditemukan" }); continue; }
  const cells = f.children.filter((n) => n.type === "RECTANGLE" && (n.name.indexOf("Paket ") === 0 || n.name.indexOf("Nom ") === 0));
  const card3 = f.children.find((n) => n.name === "Step3Card");
  const prices = f.children.filter((n) => n.type === "TEXT" && (n.name.indexOf("PaketPrice ") === 0 || n.name.indexOf("NomPrice ") === 0)).map((n) => n.characters);
  out.push({ id, name: f.name, h: f.height, cells: cells.length, cellNames: cells.map((n) => n.name), card3Y: card3 ? Math.round(card3.y) : null, prices });
}
return out;
