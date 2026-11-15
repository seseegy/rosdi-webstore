// Probe Figma s464 E57c/E65c/E66c (read-only): harga HoK/Valorant/Roblox di frame Desktop.
const out = {};
const frameTexts = (fid) => {
  const fr = figma.getNodeById(fid);
  if (!fr) return { error: "frame tidak ditemukan: " + fid };
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
  return { frame: fr.name + " (" + fr.id + ")", jumlahTeks: texts.length, teks: texts };
};
out.hok_desktop = frameTexts("93:2");
out.valorant_desktop = frameTexts("280:2");
out.roblox_desktop = frameTexts("95:2");
return out;
