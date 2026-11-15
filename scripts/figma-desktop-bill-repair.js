// Repair: kolom nilai rincian langkah 1 di frame desktop BillPage
// (311:174 Light, 311:406 Dark) terlalu sempit (210px) sehingga nilai
// "Rincian" membungkus 2 baris; di kode (.sum-row flex, kartu 716px)
// nilainya dapat ~550px dan muat 1 baris. Perbaikan: lebarkan kotak nilai
// ke 400px (x=380, tepi kanan tetap 780). Baris lain tetap 1 baris;
// posisi catatan & tinggi kartu tidak berubah.
const IDS = ["311:174", "311:406"];
const out = [];
for (const id of IDS) {
  const frame = await figma.getNodeByIdAsync(id);
  const vals = frame.children.filter((n) => n.type === "TEXT" && n.name.indexOf("BillRowVal ") === 0);
  if (vals.length !== 6) throw new Error("baris rincian tidak lengkap di " + id + ": " + vals.length);
  for (const v of vals) {
    const segs = v.getStyledTextSegments(["fontName"]);
    for (const s of segs) await figma.loadFontAsync(s.fontName);
    v.textAutoResize = "HEIGHT";
    v.resize(400, v.height);
    v.x = 380;
  }
  const rincian = vals.find((v) => v.name === "BillRowVal Rincian");
  out.push({ id, n: vals.length, rincianH: rincian.height, rincianRight: +(rincian.x + rincian.width).toFixed(1) });
}
return out;
