const IDS = ["4:2","4:29","317:2","317:29"];
const report = { fixed: [], errors: [] };
for (const fid of IDS){
  let frame;
  try { frame = await figma.getNodeByIdAsync(fid); } catch (e) { report.errors.push({ id: fid, err: "getNode: " + e.message }); continue; }
  if (!frame){ report.errors.push({ id: fid, err: "null" }); continue; }
  const actions = [];
  try {
    const note = frame.findAll(n => n.type === "TEXT" && n.characters.startsWith("Garansi"))[0];
    if (!note){ report.errors.push({ id: fid, err: "catatan garansi tidak ditemukan" }); continue; }
    // lebar sudah 318; set HEIGHT agar membungkus (resize() sebelumnya me-reset ke NONE)
    note.textAutoResize = "HEIGHT";
    const h = Math.round(note.height);
    actions.push("catatan garansi h=" + h + " autoResize=" + note.textAutoResize);
    // pindah tombol ke bawah catatan (12px jeda)
    const btnY = Math.round(note.y + note.height + 12);
    const texts = frame.findAll(n => n.type === "TEXT");
    const rects = frame.findAll(n => n.type === "RECTANGLE");
    // tombol saat ini di y=600 (rect) / 612 (teks); geser sejauh (btnY-600)
    const delta = btnY - 600;
    if (delta !== 0){
      for (const n of [...texts, ...rects]){ if (n.y >= 600 && n.y < 660) n.y += delta; }
      actions.push("tombol digeser " + delta + " -> y=" + btnY);
    }
    // besarkan kartu bila perlu (tombol bawah + 16)
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
