// Siklus 50 (lanjutan): perbaiki tumpang catatan Langkah 1 vs tautan bantuan
// di frame MLBB mobile (Light 1:208 + Dark 1:314) — ditemukan saat cek visual
// pasca-perbaikan grid. Catatan 2 baris (y=192 h=26, bawah 218) sementara
// tautan "Cara menemukan User ID saya" di y=210 -> menimpa baris ke-2.
// Perbaikan: sinkron teks catatan ke kode (GamePage.jsx:35), tautan pindah
// ke bawah catatan (celah 6px), kartu Langkah 1 memanjang, semua simpul
// y>=248 geser mengikuti; frame ikut memanjang.
async function setText(node, chars) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = chars;
}
const NOTE_CODE = "Contoh penulisan: 12345678(1234). Zone ID ditulis tanpa tanda kurung juga bisa.";
const out = [];
for (const fid of ["1:208", "1:314"]) {
  const frame = figma.getNodeById(fid);
  const note = frame.children.find(c => c.type === "TEXT" && c.characters.indexOf("Contoh: 12345678(1234)") === 0);
  const link = frame.children.find(c => c.type === "TEXT" && c.name === "Cara menemukan User ID saya");
  const card1 = frame.children.find(c => c.type === "RECTANGLE" && c.width === 358 && c.y === 84);
  if (!note || !link || !card1) throw new Error("simpul tidak ketemu di " + fid);
  const overlapBefore = link.y < note.y + note.height;
  await setText(note, NOTE_CODE);
  note.textAutoResize = "HEIGHT"; note.resize(326, note.height);
  link.y = note.y + note.height + 6;
  const newBottom = link.y + link.height + 9;
  const shift = newBottom - (card1.y + card1.height);
  card1.resize(358, card1.height + shift);
  let shifted = 0;
  for (const ch of frame.children) {
    if (ch.y >= 248 && ch.id !== card1.id) { ch.y += shift; shifted++; }
  }
  frame.resize(390, frame.height + shift);
  out.push({ frame: fid, overlapBefore, noteH: note.height, noteBottom: note.y + note.height,
    linkY: link.y, card1H: card1.height, shift, shifted, frameH: frame.height,
    gapNoteLink: link.y - (note.y + note.height) });
}
return out;
