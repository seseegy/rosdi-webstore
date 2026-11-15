// Read-only: sapuan seluruh file — simpul non-teks yang keluar batas frame
// (Siklus 63, tindak lanjut hero w=390 di frame pencarian).
// Teks sengaja dikecualikan (chip scroll sudah ditangani probe overflow v2).
async function main() {
  const out = [];
  const pages = figma.root.children;
  for (const page of pages) {
    for (const frame of page.children) {
      if (frame.type !== "FRAME") continue;
      const fb = frame.absoluteBoundingBox;
      if (!fb) continue;
      const bad = [];
      const walk = (n) => {
        if (n.type !== "TEXT" && n.type !== "GROUP" && n.id !== frame.id) {
          const b = n.absoluteBoundingBox;
          if (b) {
            const overR = +(b.x + b.width - (fb.x + fb.width)).toFixed(1);
            const overB = +(b.y + b.height - (fb.y + fb.height)).toFixed(1);
            const overL = +(fb.x - b.x).toFixed(1);
            const overT = +(fb.y - b.y).toFixed(1);
            if (overR > 0.5 || overB > 0.5 || overL > 0.5 || overT > 0.5) {
              bad.push({ id: n.id, name: n.name, type: n.type, overR, overB, overL, overT });
            }
          }
        }
        if ("children" in n) for (const c of n.children) walk(c);
      };
      walk(frame);
      if (bad.length) out.push({ frame: frame.name, frameId: frame.id, frameW: frame.width, frameH: frame.height, bad });
    }
  }
  return { framesWithOverflow: out.length, frames: out };
}
return await main();
