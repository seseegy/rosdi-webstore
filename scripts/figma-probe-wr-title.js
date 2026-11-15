// Read-only: ukur judul header frame Produk Game mobile (1:208 Light) + lebar
// "League of Legends: Wild Rift" pada font judul, dan posisi "Cek ID".
const frame = await figma.getNodeByIdAsync("1:208");
const fb = frame.absoluteBoundingBox;
const rel = (n) => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
const out = {};
for (const n of frame.children) {
  if (n.type === "TEXT" && (Math.round(n.y) === 16 || Math.round(n.y) === 36)) {
    const segs = n.getStyledTextSegments(["fontName", "fontSize"]);
    out[n.characters.slice(0, 40)] = { ...rel(n), fontName: segs[0].fontName, fontSize: segs[0].fontSize, autoResize: n.textAutoResize };
  }
  if (n.type === "TEXT" && n.characters.indexOf("Cek ID") >= 0) out["CekID"] = { ...rel(n), chars: n.characters };
}
// ukur lebar judul Wild Rift dengan font judul
const title = frame.children.find((n) => n.type === "TEXT" && Math.round(n.y) === 16);
const segs = title.getStyledTextSegments(["fontName", "fontSize"]);
const fn = segs[0].fontName; const fs = segs[0].fontSize;
const t = figma.createText();
await figma.loadFontAsync(fn);
t.fontName = fn; t.fontSize = fs; t.characters = "League of Legends: Wild Rift";
out.measureWR = { w: +t.width.toFixed(1), right: +(94 + t.width).toFixed(1), fontSize: fs };
t.remove();
return out;
