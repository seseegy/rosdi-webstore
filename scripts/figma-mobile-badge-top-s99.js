// Siklus 99: pindahkan badge ke atas sel di frame mobile PUBG/HoK/Roblox/Genshin,
// sesuai kode (.nom .badge { position:absolute; top:-8px; right:10px }).
// Pola fix Siklus 97b (FF/MLBB) — struktur ditemukan dinamis, tanpa hardcode id simpul.
// Sel Genshin 159x54 (bukan 158), jadi toleransi lebar sel |w-158|<=2.
const jobs = [
  { frameId: "114:2", label: "PUBG Mobile Light" },
  { frameId: "114:125", label: "PUBG Mobile Dark" },
  { frameId: "116:2", label: "HoK Mobile Light" },
  { frameId: "116:132", label: "HoK Mobile Dark" },
  { frameId: "120:2", label: "Roblox Mobile Light" },
  { frameId: "120:125", label: "Roblox Mobile Dark" },
  { frameId: "6:2", label: "Genshin Mobile Light" },
  { frameId: "6:108", label: "Genshin Mobile Dark" },
];
const results = [];
for (const job of jobs) {
  const frame = await figma.getNodeByIdAsync(job.frameId);
  const all = frame.findAll(() => true);
  const cells = all.filter((n) => (n.type === "RECTANGLE" || n.type === "FRAME")
    && Math.abs(n.height - 54) < 1 && Math.abs(n.width - 158) <= 2);
  const badgeTexts = frame.findAll((n) => n.type === "TEXT"
    && (/^-\d+%$/.test(n.characters) || n.characters === "Terlaris"));
  const moved = [];
  for (const badgeText of badgeTexts) {
    const cx = badgeText.x + badgeText.width / 2;
    const cy = badgeText.y + badgeText.height / 2;
    const rect = all.find((n) => n.type === "RECTANGLE" && Math.abs(n.height - 14) < 3
      && cx >= n.x - 2 && cx <= n.x + n.width + 2 && cy >= n.y - 2 && cy <= n.y + n.height + 2);
    if (!rect) throw new Error("badge rect not found for " + badgeText.characters + " in " + job.frameId);
    const cell = cells.find((c) => cx >= c.x && cx <= c.x + c.width && cy >= c.y && cy <= c.y + c.height);
    if (!cell) throw new Error("cell not found for " + badgeText.characters + " in " + job.frameId);
    const before = { rect: [Math.round(rect.x), Math.round(rect.y)], text: [Math.round(badgeText.x), Math.round(badgeText.y)] };
    const newRectX = cell.x + cell.width - 10 - rect.width;
    const newRectY = cell.y - 8;
    rect.x = newRectX;
    rect.y = newRectY;
    badgeText.x = newRectX + (rect.width - badgeText.width) / 2;
    badgeText.y = newRectY + (rect.height - badgeText.height) / 2;
    moved.push({
      chars: badgeText.characters, cellId: cell.id, cell: [Math.round(cell.x), Math.round(cell.y), Math.round(cell.width)],
      before, after: { rect: [Math.round(newRectX), Math.round(newRectY)], text: [Math.round(badgeText.x), Math.round(badgeText.y)] },
    });
  }
  results.push({ frame: job.label, moved });
}
return { results, mutatedNodeIds: results.flatMap((r) => r.moved.map((m) => m.cellId)) };
