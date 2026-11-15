const page = figma.currentPage;
const frames = page.children.filter(n => n.type === "FRAME" && /Sukses|Cek/i.test(n.name));
const out = [];
for (const f of frames){
  const texts = f.findAll(n => n.type === "TEXT").map(t => ({
    text: t.characters.length > 40 ? t.characters.slice(0, 40) + "…" : t.characters,
    x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width),
    font: t.fontName.style + " " + t.fontSize
  }));
  texts.sort((a, b) => a.y - b.y || a.x - b.x);
  // tombol: rect + teks di dalamnya (cari rect yang berisi teks "Salin"/"Cek Transaksi"/"Belanja Lagi")
  const rects = f.findAll(n => n.type === "RECTANGLE").map(r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), name: r.name }));
  out.push({ id: f.id, name: f.name, fw: Math.round(f.width), fh: Math.round(f.height), nTexts: texts.length, texts, nRects: rects.length });
}
return out;
