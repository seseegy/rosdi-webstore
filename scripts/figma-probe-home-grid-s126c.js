// Probe read-only Siklus 126c: anak Beranda Desktop Light (20:2) dengan y 960..1300
// (seksi setelah grid Top Up Game) + isi kartu HoK/Roblox baris 2.
const d = figma.getNodeById("20:2");
const kids = d.children.map((c) => ({ id: c.id, name: c.name, type: c.type,
  x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }))
  .filter((c) => c.y >= 960 && c.y <= 1300);
const hok = ["20:94", "20:95"].map((id) => {
  const n = figma.getNodeById(id);
  return n ? { id, name: n.name, chars: (n.characters || "").slice(0, 50), x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) } : { id, error: "hilang" };
});
return { frameH: Math.round(d.height), kids, hok };
