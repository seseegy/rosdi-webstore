// Perbaikan Figma s450 ide 88: font "XL" di kartu indeks Pulsa mobile 15 -> 14.5
// (operator lain 14.5; CSS .p-name 14.5px). Satu node, tanpa perubahan teks.
const node = figma.getNodeById("54:48");
const out = { before: null, after: null, error: null };
try {
  out.before = node.fontSize;
  const segs = node.getStyledTextSegments(["fontName", "fontSize"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.fontSize = 14.5;
  out.after = node.fontSize;
} catch (e) {
  out.error = String(e).slice(0, 200);
}
return out;
