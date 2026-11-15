// Siklus 58: grid nominal Voucher Google Play mobile 3 kolom -> 2 kolom (pola Siklus 52).
// Frame 3:118 Light + 3:177 Dark. Struktur ditemukan dinamis (tanpa hardcode id simpul):
// judul "Pilih Nominal", kartu 358px, 6 sel "Saldo N" + harga + meta "Kode dikirim ke email".
// Geometri baru: sel 158x66, x=32/200, baris y=280/354/428 (pitch 74); kartu Langkah 2 226->300;
// simpul di bawah kartu geser +74; frame 800->874. Sel terpilih (stroke biru) ikut pindah tanpa diubah.
async function fixFrame(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  const title = frame.children.find(c => c.type === "TEXT" && c.characters === "Pilih Nominal");
  if (!title) throw new Error("judul Pilih Nominal tidak ketemu di " + frameId);
  const card2 = frame.children.find(c => c.type === "RECTANGLE" && c.width === 358 && c.y < title.y && c.y + c.height > title.y);
  if (!card2) throw new Error("kartu Langkah 2 tidak ketemu di " + frameId);
  const names = frame.children.filter(c => c.type === "TEXT" && /^Saldo \d/.test(c.characters));
  if (names.length !== 6) throw new Error("sel nominal bukan 6 di " + frameId + ": " + names.length);
  const cells = [];
  for (const nm of names) {
    const rect = frame.children.find(c => c.type === "RECTANGLE" && c.x <= nm.x && c.x + c.width >= nm.x + nm.width && c.y <= nm.y && c.y + c.height >= nm.y + nm.height && c.width < 300);
    const price = frame.children.find(c => c.type === "TEXT" && c.characters.startsWith("Rp") && Math.abs(c.x - nm.x) < 1 && c.y > nm.y && c.y < nm.y + 40);
    const meta = frame.children.find(c => c.type === "TEXT" && c.characters === "Kode dikirim ke email" && Math.abs(c.x - nm.x) < 1 && c.y > nm.y && c.y < nm.y + 40);
    if (!rect || !price || !meta) throw new Error("sel tidak lengkap untuk " + nm.characters + " di " + frameId);
    const sel = rect.strokes.length > 0 && rect.strokes[0].color.b > 0.9 && rect.strokes[0].color.r < 0.2;
    cells.push({ name: nm, rect, price, meta, sel, oldX: rect.x, oldY: rect.y });
  }
  // Urut baris-dulu (y lalu x) sesuai urutan katalog, lalu petakan ke grid 2 kolom.
  cells.sort((a, b) => (a.oldY - b.oldY) || (a.oldX - b.oldX));
  const moved = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const row = Math.floor(i / 2), col = i % 2;
    const nx = 32 + col * 168, ny = 280 + row * 74;
    c.rect.resize(158, 66);
    c.rect.x = nx; c.rect.y = ny;
    // Nama: lebar 88->134 (HEIGHT mode, tinggi tetap 1 baris).
    const segs = c.name.getStyledTextSegments(["fontName"]);
    for (const s of segs) await figma.loadFontAsync(s.fontName);
    c.name.resize(134, c.name.height);
    c.name.x = nx + 10; c.name.y = ny + 8;
    // Harga: WIDTH_AND_HEIGHT, cukup pindah.
    c.price.x = nx + 10; c.price.y = ny + 26;
    // Meta: lebar 88->134 (HEIGHT mode, harus jadi 1 baris h=11).
    const mseg = c.meta.getStyledTextSegments(["fontName"]);
    for (const s of mseg) await figma.loadFontAsync(s.fontName);
    c.meta.resize(134, c.meta.height);
    c.meta.x = nx + 10; c.meta.y = ny + 44;
    moved.push({ item: c.name.characters, sel: c.sel, rect: { id: c.rect.id, x: nx, y: ny }, nameH: c.name.height, metaH: c.meta.height });
  }
  const DELTA = 74;
  card2.resize(358, 300);
  const movedIds = new Set();
  for (const c of cells) { movedIds.add(c.rect.id); movedIds.add(c.name.id); movedIds.add(c.price.id); movedIds.add(c.meta.id); }
  let shifted = 0;
  for (const ch of frame.children) {
    if (movedIds.has(ch.id)) continue;
    if (ch.y >= 466) { ch.y += DELTA; shifted++; }
  }
  frame.resize(390, 874);
  return { frame: frame.name, id: frame.id, frameH: frame.height, card2H: card2.height, shifted, moved };
}
return { light: await fixFrame("3:118"), dark: await fixFrame("3:177") };
