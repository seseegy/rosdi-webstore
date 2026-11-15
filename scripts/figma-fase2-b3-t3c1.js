const GREEN = {
  light: { r: 0.016, g: 0.471, b: 0.341 },   // #047857
  dark:  { r: 0.204, g: 0.827, b: 0.6 },     // #34d399
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
    const inputRect = rects.find(r => r.x === 32 && r.y === 1424 && r.width === 238);
    const inputText = texts.find(t => t.characters === "Punya kode promo?");
    const pakaiRect = rects.find(r => r.x === 278 && r.y === 1424 && r.width === 80);
    const pakaiText = texts.find(t => t.characters === "Pakai");
    const cardRect = rects.find(r => r.x === 16 && r.y === 1370 && r.width === 358);
    const heading = texts.find(t => t.characters === "Kode Promo");
    const totalValue = texts.find(t => t.characters === "Rp43.500" && Math.abs(t.y - 1838) <= 2);
    if (!inputRect || !inputText || !pakaiRect || !pakaiText || !cardRect || !heading || !totalValue){ report.errors.push({ id: cfg.id, err: "node kunci hilang" }); continue; }
    const green = GREEN[cfg.mode];
    // 0) catatan hijau: klon placeholder dulu (sebelum diubah jadi ROSDI10)
    const note = inputText.clone(); frame.appendChild(note);
    await loadFont(note); note.characters = NOTE;
    note.fills = [{ type: "SOLID", color: green }];
    note.textAutoResize = "WIDTH_AND_HEIGHT";
    note.x = 32; note.y = 1472;
    actions.push("catatan hijau @1472 h=" + Math.round(note.height));
    // 1) input: persempit + border hijau + nilai ROSDI10
    inputRect.resize(146, 40);
    inputRect.strokes = [{ type: "SOLID", color: green }];
    await loadFont(inputText);
    inputText.characters = "ROSDI10";
    inputText.fills = JSON.parse(JSON.stringify(heading.fills));
    actions.push("input ROSDI10, border hijau, lebar 146");
    // 2) Pakai geser ke kiri
    pakaiRect.x = 188;
    pakaiText.x = 211;
    actions.push("Pakai -> x=188");
    // 3) tombol Hapus (ghost, klon dari frame Sukses se-mode)
    const src = await figma.getNodeByIdAsync(cfg.sukses);
    const ghostRect = src.findAll(n => n.type === "RECTANGLE").find(r => r.x === 36 && r.y === 600 && r.width === 150);
    const ghostText = src.findAll(n => n.type === "TEXT").find(t => t.characters === "Cek Transaksi" && Math.abs(t.y - 612) <= 3);
    if (!ghostRect || !ghostText){ report.errors.push({ id: cfg.id, err: "tombol ghost sumber hilang" }); continue; }
    const hapusRect = ghostRect.clone(); frame.appendChild(hapusRect);
    hapusRect.resize(80, 40); hapusRect.x = 278; hapusRect.y = 1424;
    const hapusText = ghostText.clone(); frame.appendChild(hapusText);
    await loadFont(hapusText); hapusText.characters = "Hapus";
    hapusText.textAutoResize = "WIDTH_AND_HEIGHT";
    hapusText.x = 278 + (80 - hapusText.width) / 2; hapusText.y = 1424 + (40 - hapusText.height) / 2;
    actions.push("tombol Hapus @278,1424");
    // 4) kartu tumbuh
    cardRect.resize(cardRect.width, 132);
    actions.push("kartu tumbuh ke h=132");
    // 6) Total bar bawah -> Rp39.150 (43.500 - 4.350)
    await loadFont(totalValue);
    totalValue.characters = "Rp39.150";
    actions.push("Total bar bawah -> Rp39.150");
    report.fixed.push({ id: cfg.id, name: frame.name, actions });
  } catch (e){ report.errors.push({ id: cfg.id, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
