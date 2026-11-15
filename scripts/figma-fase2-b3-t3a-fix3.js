const IDS = ["1:2","1:105","10:2","10:105","13:2","13:111","162:2","162:111","20:2","21:2","165:2","165:247","170:2","170:247","170:492","170:737"];
const ORDER = ["Semua","Top Up Game","Pulsa","Paket Data","Token PLN","Tagihan","E-Wallet","Voucher"];
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
function smallestRect(frame, t){
  const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
  const rects = frame.findAll(n => n.type === "RECTANGLE");
  let best = null, bestArea = Infinity;
  for (const r of rects){
    if (cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height){
      const area = r.width * r.height; if (area < bestArea){ bestArea = area; best = r; }
    }
  }
  return best;
}
for (const fid of IDS){
  let frame;
  try { frame = await figma.getNodeByIdAsync(fid); } catch (e) { report.errors.push({ id: fid, err: "getNode: " + e.message }); continue; }
  if (!frame){ report.errors.push({ id: fid, err: "null" }); continue; }
  const desktop = frame.width >= 900;
  const rowY = desktop ? 361 : 305;
  const actions = [];
  try {
    const rowTexts = frame.findAll(n => n.type === "TEXT" && ORDER.includes(n.characters) && Math.abs(n.y - rowY) <= 2);
    const byLabel = {};
    for (const t of rowTexts){ if (t.fontName.style === "Medium" && !byLabel[t.characters]) byLabel[t.characters] = t; }
    // Tagihan: cari tanpa filter font (fontnya masih Semi Bold/Regular dari klon T3a)
    let tag = rowTexts.find(t => t.characters === "Tagihan");
    const ref = byLabel["Token PLN"];
    if (!tag){ report.errors.push({ id: fid, err: "Tagihan text not found at row" }); continue; }
    if (!ref){ report.errors.push({ id: fid, err: "Token PLN ref not found" }); continue; }
    // normalisasi font Tagihan -> font chip (Medium)
    const beforeFont = tag.fontName.family + " " + tag.fontName.style + " " + tag.fontSize + " w" + Math.round(tag.width);
    if (tag.fontName.style !== ref.fontName.style || tag.fontSize !== ref.fontSize){
      await figma.loadFontAsync(ref.fontName);
      await loadFont(tag);
      tag.fontName = { family: ref.fontName.family, style: ref.fontName.style };
      tag.fontSize = ref.fontSize;
      tag.textAutoResize = "WIDTH_AND_HEIGHT";
      actions.push("font Tagihan " + beforeFont + " -> " + ref.fontName.family + " " + ref.fontName.style + " " + ref.fontSize + " w" + Math.round(tag.width));
    } else { actions.push("font Tagihan sudah Medium (" + beforeFont + ")"); }
    byLabel["Tagihan"] = tag;
    // bangun ulang baris lengkap
    const pairs = {};
    for (const lab of ORDER){
      const t = byLabel[lab]; if (!t) continue;
      const r = smallestRect(frame, t);
      if (r) pairs[lab] = { text: t, rect: r };
    }
    const anchorX = desktop ? 80 : 16;
    const rowRectY = pairs["Semua"] ? pairs["Semua"].rect.y : rowY - 9;
    let cursor = anchorX; const laid = [];
    for (const lab of ORDER){
      const p = pairs[lab]; if (!p) continue;
      if (lab === "Tagihan"){ p.rect.resize(Math.ceil(p.text.width) + 26, 34); }
      p.rect.x = cursor; p.rect.y = rowRectY;
      p.text.x = cursor + 13; p.text.y = rowRectY + 9;
      laid.push(lab + "@" + Math.round(cursor));
      cursor += p.rect.width + 8;
    }
    report.fixed.push({ id: fid, name: frame.name, actions, laid });
  } catch (e){ report.errors.push({ id: fid, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
