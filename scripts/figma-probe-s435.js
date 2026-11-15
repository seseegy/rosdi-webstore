// Probe s435 — read-only: inventaris frame (mode=list) atau nama node +
// auto-layout satu frame (mode=frame, __FID__ diganti driver).
const MODE = "__MODE__";
const FID = "__FID__";
if (MODE === "list") {
  return figma.currentPage.children.map((f) => ({
    id: f.id, name: f.name, x: Math.round(f.x), y: Math.round(f.y),
    w: Math.round(f.width), h: Math.round(f.height),
  }));
}
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;
const f = byId[FID];
if (!f) return { error: "FRAME HILANG " + FID };
const GENERIC = /^(Rectangle|Frame|Text|Ellipse|Vector|Group|Component|Instance|Line|Star|Polygon|Boolean|Section|Slice)\s*\d*$/;
let total = 0, generic = 0, alFrames = 0;
const genericSample = [];
const alSample = [];
const walk = (n, depth) => {
  total++;
  if (GENERIC.test(n.name)) { generic++; if (genericSample.length < 15) genericSample.push(n.name + " (" + n.type + ")"); }
  if (n.type === "FRAME" && n.layoutMode && n.layoutMode !== "NONE") {
    alFrames++;
    if (alSample.length < 15) alSample.push(n.name + " [" + n.layoutMode + "]");
  }
  if (depth < 6 && n.children) for (const c of n.children) walk(c, depth + 1);
};
walk(f, 0);
const kids = (f.children || []).slice(0, 40).map((c) => ({
  name: c.name, type: c.type,
  layout: c.type === "FRAME" ? (c.layoutMode || "NONE") : null,
  n: (c.children || []).length,
}));
return {
  frame: FID, name: f.name, layoutMode: f.layoutMode || "NONE",
  totalNodes: total, genericNames: generic, genericSample,
  autoLayoutFrames: alFrames, alSample, children: kids,
};
