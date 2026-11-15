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
    // 1) kembalikan teks yang pindah (identifikasi via font, bukan posisi)
    const texts = frame.findAll(n => n.type === "TEXT");
    for (const t of texts){
      const style = t.fontName.style;
      if (t.characters === "Top Up Game" && style === "Semi Bold"){
        const tx = desktop ? 80 : 16, ty = desktop ? 623 : 696;
        if (Math.round(t.x) !== tx || Math.round(t.y) !== ty){ t.x = tx; t.y = ty; actions.push("hdr Top Up Game -> " + tx + "," + ty); }
      }
      if (t.characters === "Token PLN" && style === "Semi Bold" && !desktop){
        const ty = (fid === "162:2" || fid === "162:111") ? 2088 : 2103;
        if (Math.round(t.x) !== 30 || Math.round(t.y) !== ty){ t.x = 30; t.y = ty; actions.push("card Token PLN -> 30," + ty); }
      }
      if (t.characters === "Token PLN" && style === "Regular" && desktop){
        if (Math.round(t.x) !== 500 || Math.round(t.y) !== 2320){ t.x = 500; t.y = 2320; actions.push("footer Token PLN -> 500,2320"); }
      }
    }
    // 2) kembalikan rect besar yang pindah
    const rects = frame.findAll(n => n.type === "RECTANGLE");
    for (const r of rects){
      if (r.name === "Veil" && (r.x !== 0 || r.y !== 0)){ r.x = 0; r.y = 0; actions.push("Veil -> 0,0"); }
      if (r.name === "FooterBg" && (r.x !== 0 || r.y !== 2194)){ r.x = 0; r.y = 2194; actions.push("FooterBg -> 0,2194"); }
      if (!desktop && r.width === 173 && r.height >= 170 && r.height <= 190 && Math.abs(r.y - 296) <= 2){
        const ty = (fid === "162:2" || fid === "162:111") ? 2018 : 2033;
        r.x = 16; r.y = ty; actions.push("card rect Token PLN -> 16," + ty);
      }
    }
    // 3) normalisasi font teks Tagihan ke font chip baris (Medium)
    const rowTexts = frame.findAll(n => n.type === "TEXT" && ORDER.includes(n.characters) && Math.abs(n.y - rowY) <= 2);
    const byLabel = {};
    for (const t of rowTexts){ if (t.fontName.style === "Medium" && !byLabel[t.characters]) byLabel[t.characters] = t; }
    const ref = byLabel["Token PLN"], tag = byLabel["Tagihan"];
    if (ref && tag){
      const targetFont = ref.fontName, targetSize = ref.fontSize;
      const beforeFont = tag.fontName.family + " " + tag.fontName.style + " " + tag.fontSize;
      if (tag.fontName.style !== targetFont.style || tag.fontSize !== targetSize){
        await figma.loadFontAsync(targetFont);
        await loadFont(tag);
        tag.fontName = { family: targetFont.family, style: targetFont.style };
        tag.fontSize = targetSize;
        actions.push("font Tagihan " + beforeFont + " -> " + targetFont.family + " " + targetFont.style + " " + targetSize);
      }
      tag.textAutoResize = "WIDTH_AND_HEIGHT";
    }
    // 4) bangun ulang baris chip dari pasangan (teks Medium + rect terkecil)
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
