// Probe Figma s463-D: harga FF + PUBG di frame Produk Game mobile — read-only.
const r1 = (n) => Math.round(n * 10) / 10;
const out = {};
const findFrame = (re) => figma.root.findAll((n) => n.type === "FRAME" && re.test(n.name) && n.parent && n.parent.type === "PAGE");
const mobileGameFrames = findFrame(/produk game/i).filter((f) => { const b = f.absoluteBoundingBox; return b && b.width < 500; });
out.mobile_game_frames = mobileGameFrames.map((f) => ({ id: f.id, name: f.name, y: r1(f.absoluteBoundingBox.y), w: r1(f.absoluteBoundingBox.width) }));
for (const fr of mobileGameFrames) {
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
  const hasFF = texts.some((t) => t.includes("Free Fire"));
  const hasPUBG = texts.some((t) => t.includes("PUBG"));
  if (hasFF || hasPUBG) out["frame_" + fr.id.replace(":", "_")] = { frame: fr.name + " (" + fr.id + ")", jumlahTeks: texts.length, teks: texts };
}
return out;
