// Probe read-only Siklus 128: dump struktur frame Paket Data Telkomsel
// mobile (41:2) + desktop (46:2) + Indeks Data mobile (54:158) + desktop
// (51:2), Light saja — Dark cerminan struktural. Dipakai untuk merancang
// propagasi 10 paket (Tahap 5): posisi kartu Langkah 2, sel, simpul di
// bawahnya, serta teks "N paket tersedia"/"Dari Rp" di indeks.
const IDS = ["41:2", "46:2", "54:158", "51:2"];
const out = [];
for (const id of IDS) {
  const f = figma.getNodeById(id);
  if (!f) { out.push({ id, error: "tidak ditemukan" }); continue; }
  const kids = f.children.map((n) => {
    const o = { n: n.name, t: n.type, x: Math.round(n.x * 10) / 10, y: Math.round(n.y * 10) / 10, w: Math.round(n.width * 10) / 10, h: Math.round(n.height * 10) / 10 };
    if (n.type === "TEXT") o.c = n.characters.slice(0, 44);
    return o;
  });
  out.push({ id, name: f.name, w: f.width, h: f.height, count: kids.length, kids });
}
return out;
