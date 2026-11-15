// Perbaikan Figma s446 (ide 61 + 62, WRITE):
// 61: border kartu terpilih 1.6 -> 2px (samakan CSS .nom.on/.pay.on).
// 62: veil #000000 50% -> rgb(8,15,30) 55% (samakan CSS --veil).
const byId = {};
for (const f of figma.currentPage.children) byId[f.id] = f;
const out = { strokeFixed: [], veilFixed: [] };
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;

// 61
{
  const frame = byId["1:208"];
  frame.findAll().forEach((n) => {
    if (n.strokes && n.strokes.length && n.strokes[0].color && hex(n.strokes[0].color).toLowerCase() === "#2563eb" && n.strokeWeight !== 2) {
      const before = +n.strokeWeight.toFixed(2);
      n.strokeWeight = 2;
      out.strokeFixed.push({ name: n.name.slice(0, 30), type: n.type, w: Math.round(n.width), h: Math.round(n.height), before, after: n.strokeWeight });
    }
  });
}
// 62
{
  for (const f of figma.currentPage.children) {
    if (f.type !== "FRAME") continue;
    f.findAll().forEach((n) => {
      if (n.name === "Veil" && n.fills && n.fills[0]) {
        const f0 = n.fills[0];
        const before = { color: hex(f0.color), opacity: f0.opacity == null ? 1 : +f0.opacity.toFixed(2) };
        n.fills = [{ type: f0.type, color: { r: 8 / 255, g: 15 / 255, b: 30 / 255 }, opacity: 0.55 }];
        out.veilFixed.push({ frame: f.name.slice(0, 30), before, after: { color: "#080f1e", opacity: 0.55 } });
      }
    });
  }
}
return out;
