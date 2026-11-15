const GREEN = {
  light: { r: 0.016, g: 0.471, b: 0.341 },
  dark:  { r: 0.204, g: 0.827, b: 0.6 },
};
const NOTE = "Kode ROSDI10 aktif: Diskon 10% (maks Rp10.000).";
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
const FRAMES = [
  { id: "1:208", mode: "light", sukses: "4:2" },
  { id: "1:314", mode: "dark", sukses: "4:29" },
];
for (const cfg of FRAMES){
  let frame;
  try { frame = await figma.getNodeByIdAsync(cfg.id); } catch (e) { report.errors.push({ id: cfg.id, err: "getNode: " + e.message }); continue; }
  if (!frame){ report.errors.push({ id: cfg.id, err: "null" }); continue; }
  const actions = [];
  try {
    const texts = frame.findAll(n => n.type === "TEXT");
    const rects = frame.findAll(n => n.type === "RECTANGLE");
    const green = GREEN[cfg.mode];
    // 0) catatan hijau (lewati bila sudah ada)
    let note = texts.find(t => t.characters === NOTE);
    if (!note){
      const ph = texts.find(t => t.characters === "Punya kode promo?");
      if (ph){
        note = ph.clone(); frame.appendChild(note);
        await loadFont(note); note.characters = NOTE;
        note.fills = [{ type: "SOLID", color: green }];
        note.textAutoResize = "WIDTH_AND_HEIGHT";
        note.x = 32; note.y = 1472;
        actions.push("catatan hijau @1472");
      }
    } else { actions.push("catatan hijau sudah ada (lewati)"); }
    // 1) input ROSDI10 (lewati bila sudah)
    const inputRect = rects.find(r => r.x === 32 && r.y === 1424 && (r.width === 238 || r.width === 146));
    const inputText = texts.find(t => t.characters === "Punya kode promo?" || t.characters === "ROSDI10");
    const heading = texts.find(t => t.characters === "Kode Promo");
    if (inputRect && inputRect.width === 238){ inputRect.resize(146, 40); inputRect.strokes = [{ type: "SOLID", color: green }]; actions.push("input dipersempit + border hijau"); }
    if (inputText && inputText.characters !== "ROSDI10"){
      await loadFont(inputText); inputText.characters = "ROSDI10";
      inputText.fills = JSON.parse(JSON.stringify(heading.fills));
      actions.push("input -> ROSDI10");
    }
    // 2) Pakai (lewati bila sudah di 188)
    const pakaiRect = rects.find(r => r.y === 1424 && r.width === 80 && (r.x === 278 || r.x === 188));
    const pakaiText = texts.find(t => t.characters === "Pakai");
    if (pakaiRect && pakaiRect.x === 278){ pakaiRect.x = 188; actions.push("Pakai -> x=188"); }
    if (pakaiText && Math.round(pakaiText.x) !== 211){ pakaiText.x = 211; actions.push("teks Pakai -> x=211"); }
    // 3) tombol Hapus (lewati bila sudah ada)
    let hapusText = texts.find(t => t.characters === "Hapus");
    if (!hapusText){
      const src = await figma.getNodeByIdAsync(cfg.sukses);
      const ghostRect = src.findAll(n => n.type === "RECTANGLE").find(r => r.x === 36 && r.y === 606 && r.width === 150);
      const ghostText = src.findAll(n => n.type === "TEXT").find(t => t.characters === "Cek Transaksi" && Math.abs(t.y - 618) <= 3);
      if (!ghostRect || !ghostText){ report.errors.push({ id: cfg.id, err: "tombol ghost sumber hilang" }); continue; }
      const hapusRect = ghostRect.clone(); frame.appendChild(hapusRect);
      hapusRect.resize(80, 40); hapusRect.x = 278; hapusRect.y = 1424;
      hapusText = ghostText.clone(); frame.appendChild(hapusText);
      await loadFont(hapusText); hapusText.characters = "Hapus";
      hapusText.textAutoResize = "WIDTH_AND_HEIGHT";
      hapusText.x = 278 + (80 - hapusText.width) / 2; hapusText.y = 1424 + (40 - hapusText.height) / 2;
      actions.push("tombol Hapus @278,1424");
    } else { actions.push("tombol Hapus sudah ada (lewati)"); }
    // 4) kartu tumbuh (lewati bila sudah 132)
    const cardRect = rects.find(r => r.x === 16 && r.y === 1370 && r.width === 358);
    if (cardRect && cardRect.height < 132){ cardRect.resize(cardRect.width, 132); actions.push("kartu tumbuh ke h=132"); }
    // 5) Total bar bawah (lewati bila sudah Rp39.150)
    const totalValue = texts.find(t => t.characters === "Rp43.500" && Math.abs(t.y - 1838) <= 2);
    if (totalValue){ await loadFont(totalValue); totalValue.characters = "Rp39.150"; actions.push("Total bar bawah -> Rp39.150"); }
    else if (texts.find(t => t.characters === "Rp39.150" && Math.abs(t.y - 1838) <= 2)){ actions.push("Total sudah Rp39.150 (lewati)"); }
    report.fixed.push({ id: cfg.id, name: frame.name, actions });
  } catch (e){ report.errors.push({ id: cfg.id, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
