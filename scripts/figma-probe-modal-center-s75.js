// Probe Siklus 75: posisi tengah kartu modal vs tengah frame (read-only).
const IDS = ["10:2", "10:105", "13:2", "13:111", "162:2", "162:111"];
const out = [];
for (const id of IDS) {
  const f = await figma.getNodeByIdAsync(id);
  if (!f) { out.push({ id, error: "tidak ditemukan" }); continue; }
  const kids = [...f.children];
  const vi = kids.findIndex((c) => /veil/i.test(c.name));
  if (vi < 0) { out.push({ id, error: "veil tidak ada" }); continue; }
  const card = kids[vi + 1];
  const cy = card.y + card.height / 2;
  const fc = f.height / 2;
  out.push({ frame: f.name, cardY: Math.round(card.y), cardH: Math.round(card.height), center: Math.round(cy), frameCenter: Math.round(fc), offBy: Math.round(cy - fc), veilH: Math.round(kids[vi].height), frameH: Math.round(f.height) });
}
return { frames: out };
