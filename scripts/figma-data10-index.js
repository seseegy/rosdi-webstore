// Fix Siklus 128 (Tahap 5): sinkron teks Indeks Paket Data ke data.js —
// semua operator kini "10 paket tersedia" + "Dari Rp" termurah baru.
// Dijalankan lewat use_figma; placeholder __FRAME__ diisi driver.
// Hanya teks (tanpa perubahan geometri): "10 paket tersedia" 1 baris di
// lebar kartu, "Dari RpX" sama panjang karakter seperti sebelumnya.
const FRAME_ID = "__FRAME__";

const UPDATES = [
  { op: "Telkomsel", sub: "10 paket tersedia", from: "Dari Rp18.000" },
  { op: "Indosat", sub: "10 paket tersedia", from: "Dari Rp12.000" },
  { op: "XL", sub: "10 paket tersedia", from: "Dari Rp12.000" },
  { op: "Axis", sub: "10 paket tersedia", from: "Dari Rp15.000" },
  { op: "Tri", sub: "10 paket tersedia", from: "Dari Rp11.000" },
  { op: "Smartfren", sub: "10 paket tersedia", from: "Dari Rp12.000" },
];

async function setText(node, str) {
  const segs = node.getStyledTextSegments(["fontName", "fontSize"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = str;
}

const frame = figma.getNodeById(FRAME_ID);
if (!frame) throw new Error("frame tidak ditemukan: " + FRAME_ID);
const changed = [];
for (const u of UPDATES) {
  const sub = frame.children.find((n) => n.type === "TEXT" && n.name === "Sub " + u.op);
  const from = frame.children.find((n) => n.type === "TEXT" && n.name === "From " + u.op);
  if (!sub || !from) throw new Error("teks tidak ditemukan untuk " + u.op);
  const oldSub = sub.characters, oldFrom = from.characters;
  if (oldSub !== u.sub) { await setText(sub, u.sub); }
  if (oldFrom !== u.from) { await setText(from, u.from); }
  changed.push({ op: u.op, sub: oldSub + " -> " + u.sub, from: oldFrom + " -> " + u.from, subH: Math.round(sub.height * 10) / 10, fromH: Math.round(from.height * 10) / 10 });
}
return { frameId: frame.id, name: frame.name, changed };
