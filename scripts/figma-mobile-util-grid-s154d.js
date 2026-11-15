// Repair Siklus 154d: kartu Token PLN tertinggal di y=2018 (baris 2 target
// 2033) — skrip 154 hanya memindah 7 kartu, PLN diasumsikan diam padahal
// baris 2 ikut geser +15 oleh delta sub Pulsa. Perbaikan: 6 simpul PLN
// geser +15 (ke 2033) + kartu tumbuh ke 189 (samakan baris 2 dengan
// Tagihan, pola grid kode). Isi PLN tidak berubah.
const FRAME_IDS = ["1:2", "1:105", "10:2", "10:105", "13:2", "13:111"];
const results = [];
for (const fid of FRAME_IDS) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { results.push({ frame: fid, error: "tidak ditemukan" }); continue; }
  const pln = f.children.find((c) => c.type === "RECTANGLE" && c.name === "Token PLN");
  if (!pln) { results.push({ frame: f.name, id: fid, error: "kartu PLN tidak ketemu" }); continue; }
  if (Math.round(pln.x) !== 16 || Math.round(pln.y) !== 2018 || Math.round(pln.height) !== 174) {
    results.push({ frame: f.name, id: fid, error: "PLN di (" + Math.round(pln.x) + "," + Math.round(pln.y) + ") h=" + Math.round(pln.height) + " (harap 16,2018,174)" });
    continue;
  }
  const nodes = [pln];
  for (const n of f.children) {
    if (n === pln) continue;
    const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
    if (cx >= pln.x && cx <= pln.x + pln.width && cy >= pln.y && cy <= pln.y + pln.height) nodes.push(n);
  }
  if (nodes.length !== 6) { results.push({ frame: f.name, id: fid, error: "simpul PLN=" + nodes.length + " (harap 6)" }); continue; }
  for (const n of nodes) n.y += 15;
  pln.resize(pln.width, 189);
  const fromNode = nodes.find((n) => n.type === "TEXT" && (n.characters || "").indexOf("Nama pelanggan") === 0);
  const pad = fromNode ? Math.round((pln.y + pln.height) - (fromNode.y + fromNode.height)) : -1;
  results.push({ frame: f.name, id: fid, ok: true, plnY: Math.round(pln.y), plnH: Math.round(pln.height), bottomPad: pad });
}
return results;
