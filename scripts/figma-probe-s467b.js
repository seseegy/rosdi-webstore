// Probe susulan Figma s467b (read-only): hitung case-insensitive "bulan"/"instan"/"flash sale"
// + teks frame HoK Desktop Light, PUBG Desktop Light, Steam Wallet mobile Light.
const out = {};
const countWordCI = (word) => {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, "gi");
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => re.test(t.characters));
  const perFrame = {};
  let total = 0;
  for (const t of all) {
    total += (t.characters.match(re) || []).length;
    let p = t.parent, f = "?";
    while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") { f = p.name + " (" + p.id + ")"; break; } p = p.parent; }
    perFrame[f] = (perFrame[f] || 0) + (t.characters.match(re) || []).length;
  }
  return { kata: word, jumlahNode: all.length, total, jumlahFrame: Object.keys(perFrame).length, topFrame: Object.entries(perFrame).sort((a, b) => b[1] - a[1]).slice(0, 8), teksUnik: [...new Set(all.map((t) => t.characters.trim()))].slice(0, 20) };
};
for (const w of ["bulan", "instan", "flash sale"]) out["ci_" + w.replace(" ", "_")] = countWordCI(w);
const allFrames = figma.root.findAllWithCriteria({ types: ["FRAME"] }).filter((f) => f.parent && f.parent.type === "PAGE");
const countNodes = (n) => { let c = 1; if (n.children) for (const ch of n.children) c += countNodes(ch); return c; };
const frameTexts = (name) => {
  const f = allFrames.find((x) => x.name === name);
  if (!f) return null;
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  return { nama: f.name, id: f.id, lebar: f.width, tinggi: f.height, jumlahNodeTotal: countNodes(f), jumlahNodeTeks: texts.length, teks: texts.map((t) => t.characters) };
};
out.frameHoKDesktopLight = frameTexts("Honor of Kings — Desktop — Light");
out.framePUBGDesktopLight = frameTexts("PUBG Mobile — Desktop — Light");
out.frameSteamMobileLight = frameTexts("Steam Wallet IDR — Light");
return out;
