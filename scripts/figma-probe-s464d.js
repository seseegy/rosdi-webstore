// Probe Figma s464 E57/E65/E66 (read-only): harga HoK/Valorant/Roblox di frame Produk Game mobile.
const out = {};
const findFrame = (re) => figma.root.findAll((n) => n.type === "FRAME" && re.test(n.name) && n.parent && n.parent.type === "PAGE");
const mobileGameFrames = findFrame(/produk game/i).filter((f) => { const b = f.absoluteBoundingBox; return b && b.width < 500; });
out.mobile_game_frames = mobileGameFrames.map((f) => ({ id: f.id, name: f.name, w: Math.round(f.absoluteBoundingBox.width) }));
const pick = (fr, keys) => {
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
  return { frame: fr.name + " (" + fr.id + ")", jumlahTeks: texts.length, teks: texts.filter((t) => keys.some((k) => t.includes(k))) };
};
for (const fr of mobileGameFrames) {
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters);
  const hasHoK = texts.some((t) => t.includes("Honor of Kings"));
  const hasVal = texts.some((t) => t.includes("Valorant"));
  const hasRob = texts.some((t) => t.includes("Roblox"));
  if (hasHoK) out["hok_" + fr.id.replace(":", "_")] = pick(fr, ["Honor of Kings", "Token", "Weekly Card", "Rp"]);
  if (hasVal) out["valorant_" + fr.id.replace(":", "_")] = pick(fr, ["Valorant", "Points", "Rp"]);
  if (hasRob) out["roblox_" + fr.id.replace(":", "_")] = pick(fr, ["Roblox", "Robux", "Rp"]);
}
return out;
