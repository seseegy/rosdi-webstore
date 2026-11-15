// Siklus 97: tambah harga coret (was) di sel nominal berdiskon frame mobile FF + MLBB,
// dan pindahkan badge sel tersebut (juga badge Terlaris sel terpilih) ke atas sel
// sesuai kode (.nom .badge { position:absolute; top:-8px; right:10px }) agar baris
// harga muat harga + coret. Struktur ditemukan dinamis, tanpa hardcode id simpul.
const SUB = {
  light: { r: 0.392, g: 0.455, b: 0.545 }, // #64748B
  dark: { r: 0.580, g: 0.639, b: 0.722 },  // #94A3B8
};
const JOBS = [
  { frameId: "111:2", theme: "light", priceChars: "Rp9.450", wasChars: "Rp10.500", discBadge: "-10%" },
  { frameId: "111:139", theme: "dark", priceChars: "Rp9.450", wasChars: "Rp10.500", discBadge: "-10%" },
  { frameId: "1:208", theme: "light", priceChars: "Rp175.500", wasChars: "Rp185.000", discBadge: "-5%" },
  { frameId: "1:314", theme: "dark", priceChars: "Rp175.500", wasChars: "Rp185.000", discBadge: "-5%" },
];
const results = [];
for (const job of JOBS) {
  const frame = await figma.getNodeByIdAsync(job.frameId);
  const texts = frame.findAll((n) => n.type === "TEXT");
  const rects = frame.findAll((n) => n.type === "RECTANGLE");
  const price = texts.find((t) => t.characters === job.priceChars && t.fontSize === 12);
  if (!price) throw new Error("price not found in " + job.frameId);
  const cell = rects.find((r) => Math.abs(r.width - 158) < 1 && Math.abs(r.height - 54) < 1
    && price.x >= r.x && price.x < r.x + 158 && price.y >= r.y && price.y < r.y + 54);
  if (!cell) throw new Error("cell not found in " + job.frameId);
  const moved = [];
  const moveBadge = (badgeText) => {
    const cx = badgeText.x + badgeText.width / 2;
    const cy = badgeText.y + badgeText.height / 2;
    const rect = rects.find((r) => Math.abs(r.width - 42) < 3 && Math.abs(r.height - 14) < 3
      && cx >= r.x - 2 && cx <= r.x + r.width + 2 && cy >= r.y - 2 && cy <= r.y + r.height + 2);
    if (!rect) throw new Error("badge rect not found for " + badgeText.characters + " in " + job.frameId);
    const newRectX = cell.x + 158 - 10 - 42;
    const newRectY = cell.y - 8;
    rect.x = newRectX;
    rect.y = newRectY;
    badgeText.x = newRectX + (42 - badgeText.width) / 2;
    badgeText.y = newRectY + (14 - badgeText.height) / 2;
    moved.push({ chars: badgeText.characters, rect: [Math.round(newRectX), Math.round(newRectY)], text: [Math.round(badgeText.x), Math.round(badgeText.y)] });
  };
  // Badge diskon di sel yang sama dengan harga
  const discText = texts.find((t) => t.characters === job.discBadge
    && t.x >= cell.x && t.x < cell.x + 158 && t.y >= cell.y && t.y < cell.y + 54);
  if (!discText) throw new Error("discount badge text not found in " + job.frameId);
  moveBadge(discText);
  // Badge Terlaris di sel terpilih frame yang sama (aturan posisi yang sama)
  const terText = texts.find((t) => t.characters === "Terlaris");
  if (!terText) throw new Error("Terlaris badge text not found in " + job.frameId);
  const terCell = rects.find((r) => Math.abs(r.width - 158) < 1 && Math.abs(r.height - 54) < 1
    && terText.x >= r.x && terText.x < r.x + 158 && terText.y >= r.y && terText.y < r.y + 54);
  if (!terCell) throw new Error("Terlaris cell not found in " + job.frameId);
  const savedCell = { x: cell.x, y: cell.y };
  // moveBadge memakai `cell` global job; ganti sementara lewat closure: pindahkan manual
  const cx2 = terText.x + terText.width / 2;
  const cy2 = terText.y + terText.height / 2;
  const terRect = rects.find((r) => Math.abs(r.width - 42) < 3 && Math.abs(r.height - 14) < 3
    && cx2 >= r.x - 2 && cx2 <= r.x + r.width + 2 && cy2 >= r.y - 2 && cy2 <= r.y + r.height + 2);
  if (!terRect) throw new Error("Terlaris badge rect not found in " + job.frameId);
  const terRectX = terCell.x + 158 - 10 - 42;
  const terRectY = terCell.y - 8;
  terRect.x = terRectX;
  terRect.y = terRectY;
  terText.x = terRectX + (42 - terText.width) / 2;
  terText.y = terRectY + (14 - terText.height) / 2;
  moved.push({ chars: "Terlaris", rect: [Math.round(terRectX), Math.round(terRectY)], text: [Math.round(terText.x), Math.round(terText.y)] });
  // Teks coret (was) setelah harga
  const segs = price.getStyledTextSegments(["fontName"]);
  // Coret (.was) di kode font-weight 400, bukan SemiBold seperti harga
  const fontName = { family: segs.length ? segs[0].fontName.family : "Inter", style: "Regular" };
  await figma.loadFontAsync(fontName);
  const was = figma.createText();
  was.name = "Was " + job.wasChars;
  was.fontName = fontName;
  was.fontSize = 10.5;
  was.fills = [{ type: "SOLID", color: SUB[job.theme] }];
  was.textDecoration = "STRIKETHROUGH";
  was.textAutoResize = "WIDTH_AND_HEIGHT";
  was.characters = job.wasChars;
  const priceGlyphW = Math.ceil(job.priceChars.length * 12 * 0.61);
  let wasX = price.x + priceGlyphW + 6;
  const cellRightInner = savedCell.x + 158 - 12;
  if (wasX + was.width > cellRightInner) wasX = cellRightInner - was.width;
  was.x = wasX;
  was.y = price.y + Math.max(0, (price.height - was.height) / 2);
  frame.insertChild(frame.children.indexOf(price) + 1, was);
  results.push({
    frame: job.frameId, theme: job.theme, cell: [cell.x, cell.y],
    was: { id: was.id, chars: job.wasChars, x: Math.round(was.x), y: Math.round(was.y), w: Math.round(was.width), h: Math.round(was.height), right: Math.round(was.x + was.width), cellRightInner },
    moved,
  });
}
return results;
