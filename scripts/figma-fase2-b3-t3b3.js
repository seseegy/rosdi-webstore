const FRAMES = [
  { id: "317:56", ntY: 326, pitch: 30, btnY: 552, footerY: 672, token: false },
  { id: "317:132", ntY: 326, pitch: 30, btnY: 552, footerY: 672, token: false },
  { id: "80:2", ntY: 433, pitch: 30, btnY: 659, footerY: 779, token: true },
  { id: "80:83", ntY: 433, pitch: 30, btnY: 659, footerY: 779, token: true },
];
const GARANSI = "Garansi: item tidak masuk, uang kembali penuh. Simpan nomor transaksi untuk klaim.";
const WAKTU = "14/11/2026, 02.15";
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
for (const cfg of FRAMES){
  let frame;
  try { frame = await figma.getNodeByIdAsync(cfg.id); } catch (e) { report.errors.push({ id: cfg.id, err: "getNode: " + e.message }); continue; }
  if (!frame){ report.errors.push({ id: cfg.id, err: "null" }); continue; }
  const actions = [];
  try {
    const texts = frame.findAll(n => n.type === "TEXT");
    const rects = frame.findAll(n => n.type === "RECTANGLE");
    const byText = (s) => texts.find(t => t.characters === s);
    const ntLabel = byText("Nomor transaksi");
    const ntValue = texts.find(t => Math.abs(t.y - cfg.ntY) <= 2 && t.x > 600);
    const cekBtnText = texts.find(t => t.characters === "Cek Transaksi" && Math.abs(t.y - (cfg.btnY + 14)) <= 10);
    const cekBtnRect = rects.find(r => Math.abs(r.y - cfg.btnY) <= 2 && r.width >= 290 && r.width <= 300 && r.x < 400);
    const card = rects.find(r => r.name === "SuccessCard") || rects.find(r => r.x === 320 && r.width === 640 && r.y === 158);
    if (!ntLabel || !ntValue || !cekBtnText || !cekBtnRect || !card){ report.errors.push({ id: cfg.id, err: "node kunci hilang" }); continue; }
    let ntY = cfg.ntY, btnY = cfg.btnY;
    // 1) tombol "Salin token" (khusus frame token): penuh lebar di bawah teks token
    if (cfg.token){
      const tokenText = texts.find(t => /^\d{4} \d{4} \d{4} \d{4} \d{4}$/.test(t.characters));
      const tokenNote = texts.find(t => t.characters.startsWith("Masukkan 20 digit"));
      if (!tokenText || !tokenNote){ report.errors.push({ id: cfg.id, err: "node token hilang" }); continue; }
      const btnTop = Math.round(tokenText.y + tokenText.height + 8);
      const stRect = cekBtnRect.clone(); frame.appendChild(stRect);
      stRect.resize(604, 44); stRect.x = 338; stRect.y = btnTop;
      const stText = cekBtnText.clone(); frame.appendChild(stText);
      await loadFont(stText); stText.characters = "Salin token";
      stText.textAutoResize = "WIDTH_AND_HEIGHT";
      stText.x = 338 + (604 - stText.width) / 2; stText.y = btnTop + (44 - stText.height) / 2;
      const shift = 52;
      for (const n of [...texts, ...rects]){ if (n.y >= tokenNote.y && n.y < cfg.footerY) n.y += shift; }
      ntY += shift; btnY += shift;
      actions.push("tombol Salin token @" + btnTop + "; catatan+baris+tombol +" + shift);
    }
    // 2) baris Waktu di ntY+pitch; geser baris di bawahnya (kecuali tombol)
    for (const n of [...texts, ...rects]){ if (n.y > ntY && n.y < btnY) n.y += cfg.pitch; }
    const wLabel = ntLabel.clone(); frame.appendChild(wLabel);
    await loadFont(wLabel); wLabel.characters = "Waktu"; wLabel.y = ntY + cfg.pitch;
    const wValue = ntValue.clone(); frame.appendChild(wValue);
    await loadFont(wValue); wValue.characters = WAKTU; wValue.y = ntY + cfg.pitch;
    actions.push("baris Waktu @" + (ntY + cfg.pitch));
    // 3) tombol Salin di baris Nomor transaksi (nilai berakhir 942; tombol 54x28 di 888)
    ntValue.resize(238, ntValue.height);
    const salinRect = cekBtnRect.clone(); frame.appendChild(salinRect);
    salinRect.resize(54, 28); salinRect.x = 888; salinRect.y = ntY - 6;
    const salinText = cekBtnText.clone(); frame.appendChild(salinText);
    await loadFont(salinText); salinText.characters = "Salin"; salinText.fontSize = 12;
    salinText.textAutoResize = "WIDTH_AND_HEIGHT";
    salinText.x = 888 + (54 - salinText.width) / 2; salinText.y = ntY - 6 + (28 - salinText.height) / 2;
    actions.push("tombol Salin @888," + (ntY - 6));
    // 4) catatan garansi di bawah Total (cari Total dinamis pasca-geser)
    const totalLabel = texts.find(t => t.characters === "Total");
    if (!totalLabel){ report.errors.push({ id: cfg.id, err: "Total tidak ditemukan" }); continue; }
    const totalY = Math.round(totalLabel.y);
    const note = ntLabel.clone(); frame.appendChild(note);
    await loadFont(note);
    note.characters = GARANSI;
    note.resize(604, 20);
    note.textAutoResize = "HEIGHT";
    note.x = 338; note.y = totalY + 28;
    actions.push("catatan garansi @" + (totalY + 28) + " h=" + Math.round(note.height));
    // 5) tombol ke bawah catatan
    const newBtnY = Math.round(note.y + note.height + 12);
    const btnDelta = newBtnY - btnY;
    for (const n of [...texts, ...rects]){ if (n.y >= btnY && n.y < cfg.footerY) n.y += btnDelta; }
    actions.push("tombol -> y=" + newBtnY + " (delta " + btnDelta + ")");
    // 6) kartu tumbuh (tombol bawah + 16); footer geser (jaga jarak 40); frame tumbuh
    const newCardBottom = newBtnY + 44 + 16;
    const cardDelta = newCardBottom - (card.y + card.height);
    if (cardDelta > 0){ card.resize(card.width, card.height + cardDelta); actions.push("kartu tumbuh +" + cardDelta); }
    const footerDelta = (newCardBottom + 40) - cfg.footerY;
    if (footerDelta > 0){
      for (const n of [...texts, ...rects]){ if (n.y >= cfg.footerY) n.y += footerDelta; }
      actions.push("footer +" + footerDelta);
    }
    const frameNeed = cfg.footerY + footerDelta + 210;
    if (frame.height < frameNeed){ frame.resize(frame.width, frameNeed); actions.push("frame tumbuh ke h=" + Math.round(frameNeed)); }
    report.fixed.push({ id: cfg.id, name: frame.name, actions });
  } catch (e){ report.errors.push({ id: cfg.id, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
