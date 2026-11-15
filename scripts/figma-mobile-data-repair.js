// Perbaikan Siklus 21: pada build awal, loop geser (y>=460) jalan SETELAH
// sel baru dibuat, sehingga sel baris ke-3 GamesMax + catatan langkah 2
// ikut tergeser +202 dan menimpa langkah 3. Skrip ini mengembalikan
// kelima simpul itu ke posisi benar (geometri: kartu langkah 2 y=238
// h=408; grid baris 294/391/488; catatan y=604). Builder sudah diperbaiki
// urutannya (figma-mobile-data.js) agar build ulang tidak mengulang cacat.
const out = [];
for (const fid of ["41:2", "41:94"]) {
  const f = figma.getNodeById(fid);
  if (!f) { out.push({ id: fid, error: "not found" }); continue; }
  const setY = (name, y) => {
    const n = f.children.find((c) => c.name === name);
    if (!n) return { name, error: "missing" };
    const before = Math.round(n.y); n.y = y;
    return { name, before, after: Math.round(n.y) };
  };
  out.push({
    id: fid, name: f.name,
    fixes: [
      setY("Paket tampil penuh dengan harga — tanpa harus isi nomor dulu.", 604),
      setY("Paket GamesMax Booster MLBB", 488),
      setY("PaketName GamesMax Booster MLBB", 500),
      setY("PaketMeta GamesMax Booster MLBB", 527),
      setY("PaketPrice GamesMax Booster MLBB", 561),
    ],
  });
}
return { fixed: out };
