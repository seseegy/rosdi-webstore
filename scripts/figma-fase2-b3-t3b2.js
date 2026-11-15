const IDS = ["77:2","77:34"];
const GARANSI = "Garansi: item tidak masuk, uang kembali penuh. Simpan nomor transaksi untuk klaim.";
const WAKTU = "14/11/2026, 02.15";
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
for (const fid of IDS){
  let frame;
  try { frame = await figma.getNodeByIdAsync(fid); } catch (e) { report.errors.push({ id: fid, err: "getNode: " + e.message }); continue; }
  if (!frame){ report.errors.push({ id: fid, err: "null" }); continue; }
  const actions = [];
  try {
    const texts = frame.findAll(n => n.type === "TEXT");
    const rects = frame.findAll(n => n.type === "RECTANGLE");
    const byText = (s) => texts.find(t => t.characters === s);
    const tokenLabel = byText("Nomor token PLN");
    const tokenNote = texts.find(t => t.characters.startsWith("Masukkan 20 digit"));
    const ntLabel = byText("Nomor transaksi");
    const ntValue = texts.find(t => t.y === ntLabel.y && t.x > 100);
    const cekBtnText = byText("Cek Transaksi");
    if (!tokenLabel || !tokenNote || !ntLabel || !ntValue || !cekBtnText){ report.errors.push({ id: fid, err: "node kunci hilang" }); continue; }
    const ghostBtn = rects.find(r => r.y === 646 && r.width === 150 && r.x === 36);
    // 1) tombol "Salin token" penuh lebar di bawah TokenBox (342), geser catatan+baris+tombol +50
    const salinTokenRect = ghostBtn.clone(); frame.appendChild(salinTokenRect);
    salinTokenRect.resize(318, 42); salinTokenRect.x = 36; salinTokenRect.y = 342;
    const salinTokenText = cekBtnText.clone(); frame.appendChild(salinTokenText);
    await loadFont(salinTokenText); salinTokenText.characters = "Salin token";
    salinTokenText.textAutoResize = "WIDTH_AND_HEIGHT";
    salinTokenText.x = 36 + (318 - salinTokenText.width) / 2; salinTokenText.y = 342 + (42 - salinTokenText.height) / 2;
    for (const n of [...texts, ...rects]){ if (n.y >= 342) n.y += 50; }
    actions.push("tombol Salin token @342; catatan+baris+tombol +50");
    // 2) baris Waktu di NT+38 (NT kini 434); geser baris di bawahnya +38 (kecuali tombol di 696)
    const ntY = ntLabel.y; // 434
    for (const n of [...texts, ...rects]){ if (n.y > ntY && n.y < 696) n.y += 38; }
    const wLabel = ntLabel.clone(); frame.appendChild(wLabel);
    await loadFont(wLabel); wLabel.characters = "Waktu"; wLabel.y = ntY + 38;
    const wValue = ntValue.clone(); frame.appendChild(wValue);
    await loadFont(wValue); wValue.characters = WAKTU; wValue.y = ntY + 38;
    actions.push("baris Waktu @" + (ntY + 38));
    // 3) tombol Salin di baris Nomor transaksi (NT kini 434)
    ntValue.resize(116, ntValue.height);
    const salinRect = ghostBtn.clone(); frame.appendChild(salinRect);
    salinRect.resize(50, 24); salinRect.x = 304; salinRect.y = ntY - 5;
    const salinText = cekBtnText.clone(); frame.appendChild(salinText);
    await loadFont(salinText); salinText.characters = "Salin"; salinText.fontSize = 12;
    salinText.textAutoResize = "WIDTH_AND_HEIGHT";
    salinText.x = 304 + (50 - salinText.width) / 2; salinText.y = ntY - 5 + (24 - salinText.height) / 2;
    actions.push("tombol Salin @" + (ntY - 5));
    // 4) catatan garansi di bawah Total (Total kini 688)
    const totalY = 688;
    const note = tokenNote.clone(); frame.appendChild(note);
    await loadFont(note);
    note.characters = GARANSI;
    note.resize(318, 20);
    note.textAutoResize = "HEIGHT";
    note.x = 36; note.y = totalY + 28;
    actions.push("catatan garansi @" + (totalY + 28) + " h=" + Math.round(note.height));
    // 5) tombol ke bawah catatan
    const btnY = Math.round(note.y + note.height + 12);
    const btnDelta = btnY - 696;
    for (const n of [...texts, ...rects]){ if (n.y >= 696) n.y += btnDelta; }
    actions.push("tombol -> y=" + btnY + " (delta " + btnDelta + ")");
    // 6) kartu + frame tumbuh
    const card = rects.find(r => r.x === 16 && r.y === 84 && r.width === 358);
    if (card){
      const needBottom = btnY + 42 + 16;
      if (card.y + card.height < needBottom){ card.resize(card.width, needBottom - card.y); actions.push("kartu tumbuh ke h=" + Math.round(needBottom - card.y)); }
    }
    const frameNeed = (card ? card.y + card.height : btnY + 58) + 40;
    if (frame.height < frameNeed){ frame.resize(frame.width, frameNeed); actions.push("frame tumbuh ke h=" + Math.round(frameNeed)); }
    report.fixed.push({ id: fid, name: frame.name, actions });
  } catch (e){ report.errors.push({ id: fid, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
