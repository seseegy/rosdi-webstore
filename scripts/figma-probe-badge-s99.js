// Siklus 99: probe posisi badge di frame mobile PUBG/HoK/Roblox/Genshin.
// Untuk tiap frame: sel nominal 158x54, teks badge (-10%/-5%/Terlaris),
// rect latar badge (pusat teks di dalamnya), dan posisi badge relatif sel.
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
const out = [];
for (const j of jobs) {
  const frame = await figma.getNodeByIdAsync(j.frameId);
  const all = frame.findAll(() => true);
  const cells = all.filter((n) => (n.type === "RECTANGLE" || n.type === "FRAME") && Math.abs(n.width - 158) < 1 && Math.abs(n.height - 54) < 1)
    .map((n) => ({ id: n.id, name: n.name, x: Math.round(n.x), y: Math.round(n.y) }));
  const badgeTexts = frame.findAll((n) => n.type === "TEXT" && (/^-\d+%$/.test(n.characters) || n.characters === "Terlaris"))
    .map((t) => {
      const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
      const rect = all.find((n) => n.type === "RECTANGLE" && Math.abs(n.height - 14) < 3
        && cx >= n.x - 2 && cx <= n.x + n.width + 2 && cy >= n.y - 2 && cy <= n.y + n.height + 2);
      const cell = cells.find((c) => t.x >= c.x && t.x < c.x + 158 && t.y >= c.y && t.y < c.y + 54);
      return {
        id: t.id, chars: t.characters,
        text: [Math.round(t.x), Math.round(t.y), Math.round(t.width), Math.round(t.height)],
        rect: rect ? { id: rect.id, x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : null,
        cell: cell ? { id: cell.id, x: cell.x, y: cell.y } : null,
        relToCell: cell ? { dx: Math.round(t.x - cell.x), dy: Math.round(t.y - cell.y) } : null,
      };
    });
  out.push({ frame: j.label, cells: cells.length, badgeTexts });
}
return out;
