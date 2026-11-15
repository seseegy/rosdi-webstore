// Repair Siklus 154b: kartu Tagihan baru (klon PLN) sub-nya 3 baris (h=45,
// bukan 2) sehingga teks From berakhir 1px di atas tepi bawah kartu
// (bottomPad=1, seharusnya ~16 seperti kartu lain). Perbaikan: kartu
// Tagihan tumbuh +15 (174->189), semua kartu baris 3..6 + simpul di bawah
// grid geser +15, frame +15 (3379->3394), veil ikut memanjang.
const FRAME_IDS = ["1:2", "1:105", "10:2", "10:105", "13:2", "13:111"];
const results = [];
for (const fid of FRAME_IDS) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { results.push({ frame: fid, error: "tidak ditemukan" }); continue; }
  const tg = f.children.find((c) => c.type === "RECTANGLE" && c.name === "Tagihan Pascabayar");
  if (!tg) { results.push({ frame: f.name, id: fid, error: "kartu Tagihan tidak ketemu" }); continue; }
  if (Math.round(tg.height) !== 174) { results.push({ frame: f.name, id: fid, error: "tinggi kartu Tagihan " + Math.round(tg.height) + " (harap 174)" }); continue; }
  const oldH = Math.round(f.height);
  const tgBottom = tg.y + tg.height; // 2207
  // --- kelompok kartu baris 3..6: rect 173 lebar di bawah kartu Tagihan ---
  const belowCards = [];
  for (const c of f.children) {
    if (c.type !== "RECTANGLE" || Math.round(c.width) !== 173) continue;
    if (c.y <= tg.y) continue;
    if (c.name === "Tagihan Pascabayar") continue;
    const nodes = [c];
    for (const n of f.children) {
      if (n === c) continue;
      const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
      if (cx >= c.x && cx <= c.x + c.width && cy >= c.y && cy <= c.y + c.height) nodes.push(n);
    }
    belowCards.push({ card: c, nodes });
  }
  if (belowCards.length !== 7) { results.push({ frame: f.name, id: fid, error: "kartu baris 3..6 = " + belowCards.length + " (harap 7)" }); continue; }
  // --- kartu Tagihan tumbuh +15 ---
  tg.resize(tg.width, tg.height + 15);
  // --- kartu baris 3..6 geser +15 ---
  for (const g of belowCards) for (const n of g.nodes) n.y += 15;
  // --- simpul lain di bawah kartu Tagihan geser +15 (veil: memanjang) ---
  const cardNodeIds = new Set();
  for (const g of belowCards) for (const n of g.nodes) cardNodeIds.add(n.id);
  let shifted = 0, resizedFull = [];
  for (const c of f.children) {
    if (cardNodeIds.has(c.id) || c === tg) continue;
    if (c.y === 0 && Math.round(c.height) === oldH) { c.resize(c.width, oldH + 15); resizedFull.push(c.name); continue; }
    if (c.y > tgBottom) { c.y += 15; shifted++; }
  }
  f.resize(f.width, oldH + 15);
  const fromNode = f.children.find((n) => n.type === "TEXT" && n.name === "Cek tagihan, bayar sebelum jatuh tempo");
  const pad = fromNode ? Math.round((tg.y + tg.height) - (fromNode.y + fromNode.height)) : -1;
  results.push({ frame: f.name, id: fid, ok: true, tgH: Math.round(tg.height),
    movedCards: belowCards.map((g) => g.card.name + "@" + Math.round(g.card.y)),
    shifted, resizedFull, bottomPad: pad, frameH: Math.round(f.height) });
}
return results;
