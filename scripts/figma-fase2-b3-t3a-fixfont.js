const IDS = ["1:2","1:105","10:2","10:105","13:2","13:111","15:2","15:105","16:2","16:107","20:2","21:2","162:2","162:111","165:2","165:247","170:2","170:247","170:492","170:737"];
const ORDER = ["Semua","Top Up Game","Pulsa","Paket Data","Token PLN","Tagihan","E-Wallet","Voucher"];
const LABELS = ORDER.slice();
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
function pairList(frame){
  const texts = frame.findAll(n => n.type === "TEXT" && LABELS.includes(n.characters));
  const rects = frame.findAll(n => n.type === "RECTANGLE");
  const pairs = [];
  for (const t of texts){
    const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
    let best = null, bestArea = Infinity;
    for (const r of rects){
      if (cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height){
        const area = r.width * r.height; if (area < bestArea){ bestArea = area; best = r; }
      }
    }
    if (best) pairs.push({ text: t, rect: best });
  }
  pairs.sort((a, b) => a.rect.x - b.rect.x || a.text.x - b.text.x);
  return pairs;
}
for (const fid of IDS){
  let frame;
  try { frame = await figma.getNodeByIdAsync(fid); } catch (e) { report.errors.push({ id: fid, err: "getNode fail: " + e.message }); continue; }
  if (!frame){ report.errors.push({ id: fid, err: "null" }); continue; }
  try {
    const pairs = pairList(frame);
    const byLabel = {};
    for (const p of pairs){ if (!byLabel[p.text.characters]) byLabel[p.text.characters] = p; }
    const ref = byLabel["Token PLN"], tag = byLabel["Tagihan"];
    if (!ref || !tag){ report.errors.push({ id: fid, err: "ref/tag missing" }); continue; }
    // samakan font Tagihan dengan chip Token PLN (fontName + fills)
    await loadFont(ref.text); await loadFont(tag.text);
    const before = { font: tag.text.fontName.family + " " + tag.text.fontName.style + " " + tag.text.fontSize, w: Math.round(tag.text.width) };
    try { tag.text.fontName = ref.text.fontName; } catch (e) {}
    try { tag.text.fontSize = ref.text.fontSize; } catch (e) {}
    try { tag.text.fills = ref.text.fills; } catch (e) {}
    tag.text.textAutoResize = "WIDTH_AND_HEIGHT";
    tag.rect.resize(Math.ceil(tag.text.width) + 26, 34);
    const after = { font: tag.text.fontName.family + " " + tag.text.fontName.style + " " + tag.text.fontSize, w: Math.round(tag.text.width) };
    // layout ulang baris dari Semua
    const rowY = byLabel["Semua"].text.y;
    const rowRectY = byLabel["Semua"].rect.y;
    const desktop = frame.width >= 900;
    let cursor = desktop ? 80 : 16; const laid = [];
    for (const lab of ORDER){
      const p = byLabel[lab]; if (!p) continue;
      p.rect.x = cursor; p.rect.y = rowRectY;
      p.text.x = cursor + 13; p.text.y = rowRectY + 9;
      laid.push(lab + "@" + Math.round(cursor));
      cursor += p.rect.width + 8;
    }
    report.fixed.push({ id: fid, name: frame.name, before, after, laid });
  } catch (e){ report.errors.push({ id: fid, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
