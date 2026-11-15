// Read-only: hitung sel nominal di frame mobile Pulsa (2:2) & E-Wallet (3:2) + geometri kartu Langkah 2.
// Sel nominal = FRAME anak kartu Langkah 2 yang memuat teks harga Rp.
async function probe(frameId, prefixRe) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const fb = frame.absoluteBoundingBox;
  const cells = [];
  const frameH = frame.height;
  function walk(n, depth) {
    if (n.type === "TEXT" && prefixRe.test(n.characters)) {
      const b = n.absoluteBoundingBox;
      cells.push({ id: n.id, name: n.name, chars: n.characters, x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), parent: n.parent ? n.parent.id + " " + n.parent.name : "" });
    }
    if ("children" in n) for (const c of n.children) walk(c, depth + 1);
  }
  walk(frame, 0);
  // cari kartu Langkah 2: RECT/FRAME yang memuat sel pertama
  return { frame: frame.name, h: frameH, cells };
}
const p = await probe("2:2", /^Pulsa /);
const e = await probe("3:2", /^Saldo /);
return { pulsa: p, emoney: e };
