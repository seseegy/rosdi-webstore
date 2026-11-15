const IDS = ["4:2","4:29","317:2","317:29"];
const GARANSI = "Garansi: item tidak masuk, uang kembali penuh. Simpan nomor transaksi untuk klaim.";
const WAKTU = "14/11/2026, 02.15";
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
function cloneText(frame, ref, chars, x, y, w){
  const nt = ref.clone();
  frame.appendChild(nt);
  return nt;
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
    const ntLabel = byText("Nomor transaksi");
    const ntValue = texts.find(t => t.y === ntLabel.y && t.x > 100); // nilai ref (kanan)
    const cekBtnText = byText("Cek Transaksi");
    const belanjaText = byText("Belanja Lagi");
    if (!ntLabel || !ntValue || !cekBtnText || !belanjaText){ report.errors.push({ id: fid, err: "node kunci hilang" }); continue; }
    const rowY = ntLabel.y; // 286
    const pitch = 38;
    // 1) geser baris di bawah Nomor transaksi (+38): Produk..Harga, divider, Total (y < 548)
    for (const n of [...texts, ...rects]){
      if (n.y > rowY && n.y < 548) n.y += pitch;
    }
    actions.push("baris bawah digeser +38");
    // 2) baris Waktu di y = rowY + 38
    const wLabel = ntLabel.clone(); frame.appendChild(wLabel);
    await loadFont(wLabel); wLabel.characters = "Waktu"; wLabel.y = rowY + pitch;
    const wValue = ntValue.clone(); frame.appendChild(wValue);
    await loadFont(wValue); wValue.characters = WAKTU; wValue.y = rowY + pitch;
    actions.push("baris Waktu ditambah @" + (rowY + pitch));
    // 3) tombol Salin di baris Nomor transaksi: kecilkan node nilai (ujung kanan 296), tombol ghost 50x24 di (304, rowY-5)
    ntValue.resize(116, ntValue.height);
    const ghostBtn = rects.find(r => Math.abs(r.y - 548) <= 2 && r.width === 150 && r.strokes && JSON.stringify(r.strokes).includes("0.8862745")) || rects.find(r => Math.abs(r.y - 548) <= 2 && r.width === 150 && r.x === 36);
    const salinRect = ghostBtn.clone(); frame.appendChild(salinRect);
    salinRect.resize(50, 24); salinRect.x = 304; salinRect.y = rowY - 5;
    const salinText = cekBtnText.clone(); frame.appendChild(salinText);
    await loadFont(salinText); salinText.characters = "Salin"; salinText.fontSize = 12;
    salinText.textAutoResize = "WIDTH_AND_HEIGHT";
    salinText.x = 304 + (50 - salinText.width) / 2; salinText.y = rowY - 5 + (24 - salinText.height) / 2;
    actions.push("tombol Salin ditambah (304," + (rowY - 5) + ")");
    // 4) catatan garansi di bawah Total (Total kini di rowY+216+38=540)
    const totalY = rowY + 216 + pitch; // 540
    const noteRef = texts.find(t => t.y >= 660) || texts.find(t => t.characters.startsWith("Status:") || t.characters.startsWith("Tagihan sudah"));
    const note = noteRef.clone(); frame.appendChild(note);
    await loadFont(note);
    note.textAutoResize = "HEIGHT";
    note.resize(318, 20);
    note.characters = GARANSI;
    note.x = 36; note.y = totalY + 28;
    actions.push("catatan garansi @" + (totalY + 28) + " h=" + Math.round(note.height));
    // 5) pindah tombol Cek/Belanja ke bawah catatan (note.y + note.height + 12)
    const btnY = Math.round(note.y + note.height + 12);
    const btnDelta = btnY - 548;
    for (const n of [...texts, ...rects]){ if (n.y >= 548 && n.y < 660) n.y += btnDelta; }
    actions.push("tombol dipindah ke y=" + btnY + " (delta " + btnDelta + ")");
    // 6) besarkan kartu + frame bila perlu
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
