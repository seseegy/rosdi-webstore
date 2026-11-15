// Probe Siklus 74: geometri kartu game (grid Top Up Game) di satu frame.
// Read-only. Placeholder __FRAME__ diisi driver.
const FRAME_ID = "__FRAME__";
const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const out = [];
const walk = (n) => {
  if (n.y >= 690 && n.y < 1080) {
    const o = { t: n.type, name: (n.name || "").slice(0, 40), x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) };
    if (n.type === "TEXT") { o.chars = (n.characters || "").slice(0, 44); o.fs = n.fontSize; }
    out.push(o);
  }
  if ("children" in n) for (const c of n.children) walk(c);
};
walk(f);
out.sort((a, b) => a.y - b.y || a.x - b.x);
return { frame: f.name, count: out.length, nodes: out };
