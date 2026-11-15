const PLN_NOTE = "Nomor token 20 digit tampil di halaman sukses setelah pembayaran — masukkan ke meteran.";
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
const FRAMES = ["30:2", "30:241"];
for (const fid of FRAMES){
  let frame;
  try { frame = await figma.getNodeByIdAsync(fid); } catch (e) { report.errors.push({ id: fid, err: "getNode: " + e.message }); continue; }
  if (!frame){ report.errors.push({ id: fid, err: "null" }); continue; }
  const actions = [];
  try {
    const texts = frame.findAll(n => n.type === "TEXT");
    const rects = frame.findAll(n => n.type === "RECTANGLE");
    const nodes = frame.findAll(n => n.type === "TEXT" || n.type === "RECTANGLE" || n.type === "ELLIPSE");
    const step1 = rects.find(r => r.name === "Step1Card");
    const greenNote = texts.find(t => t.characters.startsWith("Nama pelanggan:"));
    const label = texts.find(t => t.characters === "Nomor Meter / ID Pelanggan");
    const footerBg = rects.find(r => r.name === "FooterBg");
    if (!step1 || !greenNote || !label || !footerBg){ report.errors.push({ id: fid, err: "node kunci hilang" }); continue; }
    const footerY = footerBg.y;
    const shift = 26;
    // geser kolom kiri di bawah Step1 + footer
    for (const n of nodes){
      if (n.y >= 364 && n.y < footerY && n.x < 824) n.y += shift;
      else if (n.y >= footerY) n.y += shift;
    }
    actions.push("langkah bawah + footer +" + shift);
    // kartu Step1 tumbuh
    step1.resize(step1.width, step1.height + shift);
    actions.push("Step1Card tumbuh ke h=" + Math.round(step1.height));
    // catatan PLN di bawah catatan hijau (340), 1 baris
    const note = greenNote.clone(); frame.appendChild(note);
    await loadFont(note);
    note.characters = PLN_NOTE;
    note.fills = JSON.parse(JSON.stringify(label.fills));
    note.textAutoResize = "WIDTH_AND_HEIGHT";
    note.x = 96; note.y = 340;
    actions.push("catatan PLN @340 h=" + Math.round(note.height));
    // frame tumbuh
    frame.resize(frame.width, frame.height + shift);
    actions.push("frame tumbuh ke h=" + Math.round(frame.height));
    report.fixed.push({ id: fid, name: frame.name, actions });
  } catch (e){ report.errors.push({ id: fid, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
