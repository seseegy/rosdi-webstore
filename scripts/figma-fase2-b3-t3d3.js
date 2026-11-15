const WALLETS = [
  { name: "GoPay", initials: "GP", color: { r: 0.059, g: 0.463, b: 0.431 }, x: 0 },
  { name: "OVO", initials: "OV", color: { r: 0.298, g: 0.114, b: 0.584 }, x: 940 },
  { name: "ShopeePay", initials: "SP", color: { r: 0.761, g: 0.255, b: 0.047 }, x: 1880 },
];
const ROW_Y = 105914;
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
for (const w of WALLETS){
  for (const mode of [{ src: "3:2", suf: "Light" }, { src: "3:60", suf: "Dark" }]){
    let frame;
    try {
      const srcFrame = await figma.getNodeByIdAsync(mode.src);
      frame = srcFrame.clone();
      frame.x = w.x + (mode.suf === "Dark" ? 470 : 0); frame.y = ROW_Y;
      frame.name = "Saldo " + w.name + " — " + mode.suf;
    } catch (e){ report.errors.push({ id: w.name + "-" + mode.suf, err: "clone: " + e.message }); continue; }
    const actions = [];
    try {
      const texts = frame.findAll(n => n.type === "TEXT");
      const rects = frame.findAll(n => n.type === "RECTANGLE");
      const title = texts.find(t => t.characters === "Saldo DANA");
      const tile = texts.find(t => t.characters === "DN");
      const tileRect = rects.find(r => r.x === 48 && r.y === 14 && r.width === 36);
      if (!title || !tile || !tileRect){ report.errors.push({ id: w.name + "-" + mode.suf, err: "node header hilang" }); continue; }
      await loadFont(title); title.characters = "Saldo " + w.name;
      await loadFont(tile); tile.characters = w.initials;
      tileRect.fills = [{ type: "SOLID", color: w.color }];
      actions.push("judul Saldo " + w.name + ", tile " + w.initials);
      report.fixed.push({ id: w.name + "-" + mode.suf, name: frame.name, actions });
    } catch (e){ report.errors.push({ id: w.name + "-" + mode.suf, err: e.message }); }
  }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
