// Perbaikan: harga Steam Wallet 45.000 di 4 frame Steam tertulis Rp47.250,
// yang benar Rp47.300 (data.js: Math.round(45000*1.05/100)*100 = 47300).
// Panjang karakter sama (8), jadi tidak ada risiko reflow.
const FRAMES = ["100:2", "100:117", "100:232", "100:477"];
const fixed = [];
for (const fid of FRAMES) {
  const frame = await figma.getNodeByIdAsync(fid);
  if (!frame) throw new Error("frame tidak ditemukan: " + fid);
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    if (t.characters === "Rp47.250") {
      const segs = t.getStyledTextSegments(["fontName"]);
      for (const s of segs) await figma.loadFontAsync(s.fontName);
      t.characters = "Rp47.300";
      fixed.push({ frame: frame.name, id: t.id });
    }
  }
}
if (fixed.length !== 4) throw new Error("diharapkan 4 node diperbaiki, dapat " + fixed.length);
return { fixed };
