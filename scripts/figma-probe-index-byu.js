// Probe read-only: struktur frame indeks (kartu operator + footer desktop)
// untuk Siklus 129 — tambah kartu by.U. Placeholder __FRAME__ diisi driver.
const frame = await figma.getNodeByIdAsync("__FRAME__");
if (!frame) throw new Error("frame tidak ditemukan");
const r = (n) => Math.round(n * 10) / 10;
const out = { id: frame.id, name: frame.name, x: r(frame.x), y: r(frame.y), w: r(frame.width), h: r(frame.height), cards: [], other: [] };
for (const ch of frame.children) {
  const rec = { name: ch.name, type: ch.type, x: r(ch.x), y: r(ch.y), w: r(ch.width), h: r(ch.height) };
  if (/^(Card|Tile|TileText|Name|Sub|From) /.test(ch.name)) out.cards.push(rec);
  else if (/^(Footer|Foot|Copyright|PayChip)/.test(ch.name)) out.other.push(rec);
}
return out;
