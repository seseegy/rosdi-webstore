// Probe s436 — read-only, satu jalan penuh file: inventaris, komponen,
// prototype, drift token warna/radius/tipografi, nama layer, constraint,
// nesting, frame yatim/error. Agregasi + sampel, bukan dump semua node.
const TOKENS = new Set([
  "F6F8FB","FFFFFF","0F172A","F1F5F9","64748B","94A3B8","E2E8F0","22314F",
  "2563EB","3B82F6","EFF6FF","16294D","F8FAFC","0E1930","059669","34D399",
  "0B1220","131F36"
]);
// Warna tile data (operator/game/e-wallet/voucher) — sah di luar token.
const TILE_OK = new Set([
  "DC2626","1E3A8A","B45309","0284C7","7C3AED","0F766E","BE185D","334155",
  "475569","4C1D95","C2410C","2563EB"
]);
const toHex = (c) => [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const solidHexes = (paints) => (paints || []).filter((p) => p.type === "SOLID" && p.visible !== false).map((p) => toHex(p.color));
const GENERIC = /^(Rectangle|Frame|Text|Ellipse|Vector|Group|Component|Instance|Line|Star|Polygon|Boolean|Section|Slice)\s*\d*$/;
const ERR_RE = /error|loading|skeleton|gagal|kosong|empty|tidak ditemukan|maaf/i;

const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
const out = {
  frameCount: frames.length,
  frames: frames.map((f) => ({ id: f.id, name: f.name, x: Math.round(f.x), y: Math.round(f.y), w: Math.round(f.width), h: Math.round(f.height) })),
  components: { component: 0, componentSet: 0, instance: 0 },
  prototype: { startNode: null, reactionCount: 0, reactionSamples: [] },
  fillColors: {}, strokeColors: {}, textColors: {},
  offToken: [],          // {frame, node, kind, hex}
  radius: {}, radiusOff: [],
  fontSizes: {}, fontOff: [],
  lineHeightFlag: [], letterSpacing: {},
  priceAlign: {},        // frame -> {LEFT:n, CENTER:n, RIGHT:n}
  genericNames: 0, genericSamples: [],
  dupNames: [],          // {frame, name, n}
  maxDepth: [],          // {frame, depth}
  errorFrames: [],
  berandaConstraints: { h: {}, v: {} },
  totalNodes: 0,
};
try {
  const psn = figma.currentPage.prototypeStartNode;
  if (psn) out.prototype.startNode = psn.name + " (" + psn.id + ")";
} catch (e) { out.prototype.startNode = "ERR " + e.message; }

const bump = (m, k) => { m[k] = (m[k] || 0) + 1; };
const CSS_SIZES = new Set([10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 17, 18, 19, 20, 23, 27, 30]);

for (const f of frames) {
  if (ERR_RE.test(f.name)) out.errorFrames.push(f.name);
  let depthMax = 0;
  const nameCount = {};
  const walk = (n, depth, frameName) => {
    out.totalNodes++;
    if (depth > depthMax) depthMax = depth;
    if (n.type === "COMPONENT") out.components.component++;
    if (n.type === "COMPONENT_SET") out.components.componentSet++;
    if (n.type === "INSTANCE") out.components.instance++;
    if (n.reactions && n.reactions.length) {
      out.prototype.reactionCount += n.reactions.length;
      if (out.prototype.reactionSamples.length < 10) out.prototype.reactionSamples.push(n.name + " -> " + n.reactions.length + " reaksi");
    }
    if (GENERIC.test(n.name)) {
      out.genericNames++;
      if (out.genericSamples.length < 20) out.genericSamples.push(frameName + " / " + n.name + " (" + n.type + ")");
    }
    nameCount[n.name] = (nameCount[n.name] || 0) + 1;
    if (n.visible !== false) {
      for (const h of solidHexes(n.fills)) {
        bump(out.fillColors, h);
        if (!TOKENS.has(h) && !TILE_OK.has(h) && out.offToken.length < 120) out.offToken.push({ frame: frameName, node: n.name, kind: "fill", hex: h });
      }
      for (const h of solidHexes(n.strokes)) {
        bump(out.strokeColors, h);
        if (!TOKENS.has(h) && !TILE_OK.has(h) && out.offToken.length < 120) out.offToken.push({ frame: frameName, node: n.name, kind: "stroke", hex: h });
      }
      if (n.type === "TEXT") {
        for (const h of solidHexes(n.fills)) bump(out.textColors, h);
        const fs = n.fontSize;
        if (typeof fs === "number") {
          bump(out.fontSizes, String(fs));
          if (!CSS_SIZES.has(fs) && out.fontOff.length < 40) out.fontOff.push({ frame: frameName, node: n.name, size: fs, text: (n.characters || "").slice(0, 40) });
        }
        const lh = n.lineHeight;
        if (lh && lh.unit === "PIXELS" && typeof fs === "number" && lh.value < fs) {
          if (out.lineHeightFlag.length < 30) out.lineHeightFlag.push({ frame: frameName, node: n.name, size: fs, lh: lh.value, text: (n.characters || "").slice(0, 40) });
        }
        if (lh && lh.unit === "PERCENT" && lh.value < 100) {
          if (out.lineHeightFlag.length < 30) out.lineHeightFlag.push({ frame: frameName, node: n.name, size: fs, lhPct: lh.value, text: (n.characters || "").slice(0, 40) });
        }
        const ls = n.letterSpacing;
        if (ls && ls.value !== 0) {
          bump(out.letterSpacing, JSON.stringify(ls));
          // sampel tidak dikumpul terpisah; cukup hitungan
        }
        if ((n.characters || "").includes("Rp")) {
          const pa = out.priceAlign[frameName] || (out.priceAlign[frameName] = { LEFT: 0, CENTER: 0, RIGHT: 0 });
          pa[n.textAlignHorizontal || "LEFT"] = (pa[n.textAlignHorizontal || "LEFT"] || 0) + 1;
        }
      }
      if (typeof n.cornerRadius === "number" && n.cornerRadius > 0) {
        bump(out.radius, String(n.cornerRadius));
        if (![14, 10].includes(n.cornerRadius) && out.radiusOff.length < 60) out.radiusOff.push({ frame: frameName, node: n.name, r: n.cornerRadius });
      }
    }
    if (n.children) for (const c of n.children) walk(c, depth + 1, frameName);
  };
  walk(f, 0, f.name);
  out.maxDepth.push({ frame: f.name, depth: depthMax });
  for (const [nm, n] of Object.entries(nameCount)) {
    if (n > 1 && out.dupNames.length < 40) out.dupNames.push({ frame: f.name, name: nm, n });
  }
  // constraint anak langsung frame Beranda (ide 27)
  if (/beranda/i.test(f.name)) {
    for (const c of (f.children || [])) {
      bump(out.berandaConstraints.h, c.constraints ? c.constraints.horizontal : "?");
      bump(out.berandaConstraints.v, c.constraints ? c.constraints.vertical : "?");
    }
  }
}
out.maxDepth.sort((a, b) => b.depth - a.depth);
out.maxDepth = out.maxDepth.slice(0, 8);
return out;
