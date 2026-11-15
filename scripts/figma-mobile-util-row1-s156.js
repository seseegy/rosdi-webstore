// Repair Siklus 156: baris 1 grid util Beranda Mobile + latar modal tidak
// seragam — kartu Pulsa Reguler h=187 (sub by.U 3 baris, Siklus 154) vs kartu
// Paket Data h=172, selisih 15px (temuan Siklus 155, terukur dari piksel PNG).
// Grid kode (.c3, align-items stretch) menyamakan tinggi kartu sebaris.
// Perbaikan: kartu Paket Data tumbuh 172 -> 187 di 6 frame (pola repair 154d).
// Anak kartu tidak digeser (teks Dari tetap di tempatnya, padding bawah
// tumbuh) dan baris 2 sudah di y=2033, jadi tidak ada simpul yang ikut geser.
const FRAME_IDS = ["1:2", "1:105", "10:2", "10:105", "13:2", "13:111"];
const results = [];
for (const fid of FRAME_IDS) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { results.push({ frame: fid, error: "tidak ditemukan" }); continue; }
  const data = f.children.find((c) => c.type === "RECTANGLE" && c.name === "Paket Data");
  if (!data) { results.push({ frame: f.name, id: fid, error: "kartu Paket Data tidak ketemu" }); continue; }
  const pulsa = f.children.find((c) => c.type === "RECTANGLE" && c.name === "Pulsa Reguler");
  const pulsaH = pulsa ? Math.round(pulsa.height) : -1;
  if (Math.round(data.x) !== 201 || Math.round(data.y) !== 1834 || Math.round(data.height) < 170 || Math.round(data.height) > 175) {
    results.push({ frame: f.name, id: fid, error: "Paket Data di (" + Math.round(data.x) + "," + Math.round(data.y) + ") h=" + Math.round(data.height) + " (harap 201,1834,170-175)", pulsaH });
    continue;
  }
  const nodes = [data];
  for (const n of f.children) {
    if (n === data) continue;
    const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
    if (cx >= data.x && cx <= data.x + data.width && cy >= data.y && cy <= data.y + data.height) nodes.push(n);
  }
  if (nodes.length !== 6) { results.push({ frame: f.name, id: fid, error: "simpul Paket Data=" + nodes.length + " (harap 6)", pulsaH }); continue; }
  const texts = nodes.filter((n) => n.type === "TEXT").sort((a, b) => a.y - b.y);
  const fromNode = texts[texts.length - 1];
  const h0 = Math.round(data.height);
  const pad0 = fromNode ? Math.round((data.y + data.height) - (fromNode.y + fromNode.height)) : -1;
  data.resize(data.width, 187);
  const pad1 = fromNode ? Math.round((data.y + data.height) - (fromNode.y + fromNode.height)) : -1;
  results.push({ frame: f.name, id: fid, ok: true, h0, h1: Math.round(data.height),
    pulsaH, bottomPad0: pad0, bottomPad1: pad1,
    row1Uniform: Math.round(data.height) === pulsaH });
}
return results;
