// Probe read-only batch s001: audit token agregat di semua frame.
// Kumpulkan: distinct fill hex (dengan jumlah), distinct stroke hex,
// distinct cornerRadius (frame/rect), distinct fontSize+fontWeight,
// serta node kartu (nama mengandung "card"/"Card" atau FRAME anak top-level)
// yang radius-nya bukan 14.
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
const TOKENS = new Set([
  "#f6f8fb", "#ffffff", "#0f172a", "#64748b", "#94a3b8", "#e2e8f0", "#2563eb",
  "#eff6ff", "#f8fafc", "#059669", "#0b1220", "#131f36", "#f1f5f9", "#22314f",
  "#3b82f6", "#16294d", "#0e1930", "#34d399", "#1d4ed8", "#1e3a8a", "#172f5e",
  "#eef2f7", "#ecfdf5", "#0c2b21", "#dc2626", "#fef2f2", "#f87171", "#33161a",
  "#b45309", "#fffbeb", "#fbbf24", "#2e230a", "#c7d7fb", "#5b6b82", "#9db0c9",
  "#60a5fa", "#dbeafe",
  // warna tile produk dari data.js (bukan token CSS tapi sah)
  "#0284c7", "#0f766e", "#334155", "#475569", "#7c3aed", "#be185d", "#1e3a8a",
  "#b45309", "#4c1d95", "#c2410c",
]);
const fills = {}, strokes = {}, radii = {}, fonts = {};
const offToken = {}; // hex di luar token + contoh node
const radiusBad = []; // kartu dengan radius != 14
const page = figma.currentPage;
for (const f of page.children.filter((n) => n.type === "FRAME")) {
  const all = f.findAll(() => true);
  for (const n of all) {
    if (Array.isArray(n.fills)) for (const p of n.fills) {
      if (p && p.type === "SOLID" && p.color) {
        const h = hex(p.color).toLowerCase();
        fills[h] = (fills[h] || 0) + 1;
        if (!TOKENS.has(h)) { if (!offToken[h]) offToken[h] = []; if (offToken[h].length < 3) offToken[h].push(f.name + " / " + n.name); }
      }
    }
    if (Array.isArray(n.strokes)) for (const p of n.strokes) {
      if (p && p.type === "SOLID" && p.color) {
        const h = hex(p.color).toLowerCase();
        strokes[h] = (strokes[h] || 0) + 1;
        if (!TOKENS.has(h)) { if (!offToken[h]) offToken[h] = []; if (offToken[h].length < 3) offToken[h].push(f.name + " / " + n.name + " (stroke)"); }
      }
    }
    if ((n.type === "FRAME" || n.type === "RECTANGLE" || n.type === "COMPONENT" || n.type === "INSTANCE") && typeof n.cornerRadius === "number") {
      const r = n.cornerRadius;
      radii[r] = (radii[r] || 0) + 1;
      if (n !== f && /card|kartu|tile|button|btn|chip|modal|input|field/i.test(n.name) && r !== 14 && r !== 0) {
        if (radiusBad.length < 60) radiusBad.push({ frame: f.name, node: n.name, type: n.type, r, w: Math.round(n.width), h: Math.round(n.height) });
      }
    }
    if (n.type === "TEXT") {
      const k = n.fontSize + "/" + (n.fontName ? n.fontName.style : "?");
      fonts[k] = (fonts[k] || 0) + 1;
    }
  }
}
return { fills, strokes, radii, fonts, offToken, radiusBad, radiusBadCount: radiusBad.length };
