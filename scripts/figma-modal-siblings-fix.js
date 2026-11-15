// Repair Siklus 69b: modal di Figma itu FLAT — rect kartu "Modal" adalah
// saudara (bukan parent) dari judul/isi/tombol. Fix Siklus 69 hanya
// menggeser rect kartu (+5 S&K/Masuk, +26 Refund) sehingga judul Refund
// kini 6px DI ATAS tepi kartu (y=939 vs kartu 945) dan menimpa teks latar.
// Perbaikan: geser semua simpul modal SETELAH rect kartu sebesar
// (kartu.y + 20 − judul.y) agar padding atas 20px pulih; rect tak digeser.
const FRAMES = ["10:2", "10:105", "13:2", "13:111", "162:2", "162:111"];
const results = [];
for (const fid of FRAMES) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { results.push({ frame: fid, error: "tidak ditemukan" }); continue; }
  const veilIdx = f.children.findIndex((c) => c.name === "Veil");
  const card = f.children[veilIdx + 1];
  const rest = f.children.slice(veilIdx + 2);
  const title = rest.find((c) => c.type === "TEXT" && c.characters.length > 0 && c.characters.length < 40);
  const r = { frame: fid, name: f.name, cardY: Math.round(card.y), cardH: Math.round(card.height) };
  if (!title) { r.error = "judul tidak ketemu"; results.push(r); continue; }
  const shift = Math.round(card.y + 20 - title.y);
  r.titleYBefore = Math.round(title.y);
  r.shift = shift;
  if (shift !== 0) {
    for (const c of rest) c.y += shift;
  }
  r.titleYAfter = Math.round(title.y);
  r.padTopAfter = Math.round(title.y - card.y);
  // verifikasi: tombol di dalam kartu (bawah kartu − tombol − 44 = 20)
  const btn = rest.find((c) => c.name === "Tombol Tutup" || c.name === "Tombol Masuk");
  r.btnBottomPad = btn ? Math.round(card.y + card.height - (btn.y + btn.height)) : null;
  r.moved = rest.map((c) => c.id);
  results.push(r);
}
return { nFrames: results.length, results };
