// Probe Figma s463 ide 56-67 + I100 (read-only).
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const frameOf = (t) => {
  let p = t.parent;
  while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") return p.name + " (" + p.id + ")"; p = p.parent; }
  return "?";
};
const out = {};

// Daftar semua frame top-level (untuk menemukan frame Produk Game mobile)
out.frames = figma.root.findAll((n) => n.type === "FRAME" && n.parent && n.parent.type === "PAGE")
  .map((f) => ({ id: f.id, name: f.name, y: f.absoluteBoundingBox ? r1(f.absoluteBoundingBox.y) : null, w: f.absoluteBoundingBox ? r1(f.absoluteBoundingBox.width) : null }));

// E56-E63 + I100: hitung kata di seluruh file
const countWord = (word) => {
  const reSub = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  const reWord = new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes(word));
  const perFrame = {};
  let totalSub = 0, totalWord = 0;
  for (const t of all) {
    totalSub += (t.characters.match(reSub) || []).length;
    totalWord += (t.characters.match(reWord) || []).length;
    const f = frameOf(t);
    perFrame[f] = (perFrame[f] || 0) + (t.characters.match(reSub) || []).length;
  }
  return { kata: word, jumlahNode: all.length, totalSubstring: totalSub, totalKataUtuh: totalWord, perFrame, teksUnik: [...new Set(all.map((t) => t.characters.trim()))].slice(0, 40) };
};
out.e56_masuk = countWord("Masuk");
out.e57_keluar = countWord("Keluar");
out.e58_tutup = countWord("Tutup");
out.e59_lacak = countWord("Lacak");
out.e60_salin = countWord("Salin");
out.e61_kembali = countWord("Kembali");
out.e62_simpan = countWord("Simpan");
out.e63_hapus = countWord("Hapus");
out.i100_gopay_salah = countWord("Gopay");
out.i100_dana_salah = countWord("Dana");
out.i100_shopeepay_salah = countWord("Shopeepay");
out.i100_gopay_benar = countWord("GoPay");
out.i100_dana_benar = countWord("DANA");
out.i100_ovo_benar = countWord("OVO");
out.i100_shopeepay_benar = countWord("ShopeePay");

// E64/E65: hitung node/teks frame Desktop
const frameTexts = (fid) => {
  const fr = F(fid);
  if (!fr) return { error: "frame tidak ditemukan: " + fid };
  let nodes = 0;
  const walk = (n) => { nodes++; if (n.children) n.children.forEach(walk); };
  walk(fr);
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
  return { frame: fr.name + " (" + fr.id + ")", jumlahNode: nodes, jumlahTeks: texts.length, teks: texts };
};
out.e64_game_desktop = frameTexts("26:2");
out.e64_game_desktop_dark = frameTexts("26:281");
out.e65_pln_desktop = frameTexts("30:2");
out.e65_pln_desktop_dark = frameTexts("30:241");

// E66/E67: harga FF + PUBG di frame Produk Game mobile — cari frame mobile yang memuat "Free Fire" dan "PUBG Mobile"
const findFrame = (re) => figma.root.findAll((n) => n.type === "FRAME" && re.test(n.name) && n.parent && n.parent.type === "PAGE");
const mobileGameFrames = findFrame(/produk game/i).filter((f) => { const b = f.absoluteBoundingBox; return b && b.width < 500; });
out.mobile_game_frames = mobileGameFrames.map((f) => ({ id: f.id, name: f.name, y: r1(f.absoluteBoundingBox.y), w: r1(f.absoluteBoundingBox.width) }));
const priceTexts = (fr) => {
  if (!fr) return { error: "frame tidak ditemukan" };
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
  return { frame: fr.name + " (" + fr.id + ")", jumlahTeks: texts.length, teks: texts };
};
// semua frame mobile produk game yang mengandung "Free Fire" atau "PUBG"
for (const fr of mobileGameFrames) {
  const hasFF = fr.findAllWithCriteria({ types: ["TEXT"] }).some((t) => t.characters.includes("Free Fire"));
  const hasPUBG = fr.findAllWithCriteria({ types: ["TEXT"] }).some((t) => t.characters.includes("PUBG"));
  if (hasFF || hasPUBG) out["e66_67_" + fr.id.replace(":", "_")] = priceTexts(fr);
}

return out;
