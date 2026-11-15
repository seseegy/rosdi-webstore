// Probe triase Siklus 69e (read-only): daftar anak frame 13:2 dari veil
// sampai akhir — tipe + y lokal + tinggi + nama, untuk melihat apakah
// judul/isi/tombol modal adalah anak kartu atau saudara rect kartu.
const f = await figma.getNodeByIdAsync("13:2");
if (!f) return { error: "frame 13:2 tidak ditemukan" };
const veilIdx = f.children.findIndex((c) => c.name === "Veil");
const after = f.children.slice(veilIdx).map((c) => ({
  idx: f.children.indexOf(c), id: c.id, name: c.name, type: c.type,
  y: Math.round(c.y), h: Math.round(c.height),
  chars: ("characters" in c ? (c.characters || "").slice(0, 40) : ""),
  hasKids: Array.isArray(c.children) ? c.children.length : null,
}));
return { frame: f.name, frameH: Math.round(f.height), veilIdx, nChildren: f.children.length, after };
