// Polish Siklus 154c: samakan tinggi kartu Token PLN dengan kartu Tagihan
// (189) — di grid kode, satu baris grid meregang ke kartu tertinggi, jadi
// kedua kartu baris 2 harus sama tinggi; setelah Siklus 154b PLN 174 vs
// Tagihan 189. Tidak ada simpul yang digeser (isi PLN berakhir jauh di
// atas tepi bawah kartu).
const FRAME_IDS = ["1:2", "1:105", "10:2", "10:105", "13:2", "13:111"];
const results = [];
for (const fid of FRAME_IDS) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { results.push({ frame: fid, error: "tidak ditemukan" }); continue; }
  const pln = f.children.find((c) => c.type === "RECTANGLE" && c.name === "Token PLN");
  if (!pln) { results.push({ frame: f.name, id: fid, error: "kartu PLN tidak ketemu" }); continue; }
  if (Math.round(pln.y) !== 2033 || Math.round(pln.height) !== 174) {
    results.push({ frame: f.name, id: fid, error: "PLN di (" + Math.round(pln.x) + "," + Math.round(pln.y) + ") h=" + Math.round(pln.height) + " (harap y=2033 h=174)" });
    continue;
  }
  pln.resize(pln.width, 189);
  results.push({ frame: f.name, id: fid, ok: true, plnH: Math.round(pln.height) });
}
return results;
