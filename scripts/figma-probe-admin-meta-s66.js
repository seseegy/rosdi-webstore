// Probe read-only: cari teks "Admin sudah termasuk" di seluruh file (temuan Siklus 66:
// latar Beranda Desktop di balik veil modal menampilkan meta e-wallet yang dipendekkan,
// bukan "Biaya admin sudah termasuk" persis data.js seperti frame mobile pasca-Siklus 53).
const hits = [];
for (const page of figma.root.children) {
  for (const frame of page.children) {
    if (frame.type !== "FRAME") continue;
    const texts = frame.findAll((n) => n.type === "TEXT" && typeof n.characters === "string" && n.characters.indexOf("Admin sudah termasuk") !== -1);
    for (const t of texts) hits.push({ frame: frame.name, id: frame.id, chars: t.characters.slice(0, 60) });
  }
}
return { count: hits.length, hits: hits.slice(0, 40) };
