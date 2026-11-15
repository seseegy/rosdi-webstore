// Read-only: probe overflow teks di seluruh file, v2 (Siklus 59).
// Revisi dari v1 berdasarkan triase 124 temuan v1 (semuanya false positive):
//  1. Kotak teks satu baris LEFT + textAutoResize HEIGHT sering lebih lebar
//     dari glifnya (mis. harga w=134, glif ~52px) sehingga badge di kanan sel
//     ter-flag tumpang. v2 memakai lebar efektif = min(w, ceil(n * fs * 0.62))
//     untuk teks satu baris; faktor 0.62 konservatif (Inter ~0.56em/karakter
//     untuk digit) dan tetap mem-flag kasus nyata Siklus 31 (coret Rp30.900
//     yang tertutup badge — teruji di node, lihat MARATHON-LOG Siklus 59).
//  2. Teks latar modal yang tertutup kartu modal (opaque, di antara kedua
//     teks dalam z-order) bukan tumpang visual — v2 mengabaikan pasangan
//     yang irisannya tertutup penuh oleh panel opaque besar (w>=100, h>=50)
//     yang z-nya di antara kedua teks.
//  3. overflow-right baris chip kategori (scroll horizontal, sudah dicatat
//     sejak Siklus 11) tetap dilaporkan apa adanya — bukan cacat baru.
// Output hanya temuan.
const frames = figma.currentPage.children.filter(n => n.type === "FRAME");
const findings = [];
let textCount = 0;
function effBox(t) {
  const b = t.absoluteBoundingBox;
  let w = b.width;
  if (t.textAlignHorizontal === "LEFT" && t.textAutoResize === "HEIGHT" && typeof t.fontSize === "number" && b.height <= t.fontSize * 1.5 && !t.characters.includes("\n")) {
    w = Math.min(b.width, Math.ceil(t.characters.length * t.fontSize * 0.62));
  }
  return { id: t.id, name: t.name.slice(0, 32), chars: t.characters.slice(0, 34), x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +w.toFixed(1), h: +b.height.toFixed(1) };
}
for (const frame of frames) {
  const fb = frame.absoluteBoundingBox;
  // urutan z datar (depth-first) untuk uji oklusi
  const flat = frame.findAll(() => true);
  const zIndex = new Map(flat.map((n, i) => [n.id, i]));
  const panels = flat.filter(n => n.type === "RECTANGLE" && n.visible && n.width >= 100 && n.height >= 50 && n.fills && n.fills.length && n.fills[0].type === "SOLID" && (n.fills[0].opacity === undefined || n.fills[0].opacity === 1) && (n.opacity === undefined || n.opacity === 1)).map(n => ({ z: zIndex.get(n.id), b: n.absoluteBoundingBox }));
  const texts = frame.findAll(n => n.type === "TEXT" && n.visible && n.characters.trim().length > 0);
  textCount += texts.length;
  const boxes = texts.map(effBox);
  for (const b of boxes) {
    if (b.x + b.w > fb.x + fb.width + 1) findings.push({ frame: frame.name, frameId: frame.id, kind: "overflow-right", a: b, over: +(b.x + b.w - (fb.x + fb.width)).toFixed(1) });
    if (b.y + b.h > fb.y + fb.height + 1) findings.push({ frame: frame.name, frameId: frame.id, kind: "overflow-bottom", a: b, over: +(b.y + b.h - (fb.y + fb.height)).toFixed(1) });
    if (b.x < fb.x - 1) findings.push({ frame: frame.name, frameId: frame.id, kind: "overflow-left", a: b, over: +(fb.x - b.x).toFixed(1) });
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const p = boxes[i], q = boxes[j];
      const ix0 = Math.max(p.x, q.x), iy0 = Math.max(p.y, q.y);
      const ix1 = Math.min(p.x + p.w, q.x + q.w), iy1 = Math.min(p.y + p.h, q.y + q.h);
      const ox = ix1 - ix0, oy = iy1 - iy0;
      if (ox < 2 || oy < 2) continue;
      const zlo = Math.min(zIndex.get(p.id), zIndex.get(q.id)), zhi = Math.max(zIndex.get(p.id), zIndex.get(q.id));
      const occluded = panels.some(pn => pn.z > zlo && pn.z < zhi && pn.b.x <= ix0 && pn.b.y <= iy0 && pn.b.x + pn.b.width >= ix1 && pn.b.y + pn.b.height >= iy1);
      if (occluded) continue;
      findings.push({ frame: frame.name, frameId: frame.id, kind: "text-overlap", a: p, b: q, ox: +ox.toFixed(1), oy: +oy.toFixed(1) });
    }
  }
}
return { frames: frames.length, texts: textCount, findingsTotal: findings.length, findings: findings.slice(0, 200) };
