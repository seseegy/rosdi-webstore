// Probe s433c — read-only: hygiene file Figma (ide 96-100) + isi Sukses/Cek detail.
// 96 hidden nodes, 97 text/color styles, 98 urutan frame vs y, 99 duplikat bertumpuk, 100 jumlah node.
const frames = figma.currentPage.children;
const out = { hidden: [], styles: {}, order: [], dups: {}, nodeCounts: [], totalNodes: 0 };
// 96: node visible=false (rekursif, laporkan per frame)
for (const f of frames) {
  let hidden = 0; let total = 0;
  const walk = (n) => {
    total++;
    if (n.visible === false) hidden++;
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(f);
  out.totalNodes += total;
  out.nodeCounts.push({ frame: f.name, id: f.id, nodes: total, hidden });
  if (hidden > 0) out.hidden.push({ frame: f.name, id: f.id, hidden });
}
out.nodeCounts.sort((a, b) => b.nodes - a.nodes);
out.nodeCountsTop5 = out.nodeCounts.slice(0, 5);
// 97: shared styles
try {
  out.styles.textStyles = figma.getLocalTextStyles().map((s) => s.name);
  out.styles.paintStyles = figma.getLocalPaintStyles().map((s) => s.name);
  out.styles.effectStyles = figma.getLocalEffectStyles().map((s) => s.name);
} catch (e) { out.styles.error = String(e); }
// 98: urutan frame di panel Layers vs y (apakah sudah urut y menaik?)
const ys = frames.map((f, i) => ({ i, name: f.name, y: Math.round(f.absoluteBoundingBox.y) }));
let inversions = 0;
for (let i = 1; i < ys.length; i++) if (ys[i].y < ys[i - 1].y) inversions++;
out.order = { nFrames: ys.length, inversions, first10: ys.slice(0, 10), last5: ys.slice(-5) };
// 99: duplikat bertumpuk — dua node teks identik di posisi absolut sama (dalam satu frame)
const sig = (n) => {
  const b = n.absoluteBoundingBox; if (!b) return null;
  return n.type + "|" + (n.characters || n.name || "") + "|" + Math.round(b.x) + "|" + Math.round(b.y) + "|" + Math.round(b.width) + "|" + Math.round(b.height);
};
for (const f of frames) {
  const seen = {};
  let dups = 0; const samples = [];
  const walk = (n) => {
    if (n.type === "TEXT" && n.characters) {
      const s = sig(n);
      if (seen[s]) { dups++; if (samples.length < 3) samples.push({ chars: n.characters.slice(0, 40), id: n.id }); }
      else seen[s] = true;
    }
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(f);
  if (dups > 0) out.dups[f.name] = { id: f.id, dups, samples };
}
// Nama frame rusak (karakter pengganti U+FFFD)
out.badNames = frames.filter((f) => /�/.test(f.name)).map((f) => ({ id: f.id, name: f.name }));
return out;
