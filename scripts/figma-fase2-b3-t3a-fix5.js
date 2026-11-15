const IDS = ["1:2","1:105","10:2","10:105","13:2","13:111","162:2","162:111","20:2","21:2","165:2","165:247","170:2","170:247","170:492","170:737"];
const ORDER = ["Semua","Top Up Game","Pulsa","Paket Data","Token PLN","Tagihan","E-Wallet","Voucher"];
const report = { fixed: [], errors: [] };
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
    const ref = byLabel["Token PLN"];
    let tag = rowTexts.find(t => t.characters === "Tagihan");
    if (!ref || !tag){ report.errors.push({ id: fid, err: "ref/tag missing" }); continue; }
    // samakan warna teks Tagihan dengan chip Token PLN
    const fillsBefore = JSON.stringify(tag.fills);
    const fillsAfter = JSON.stringify(ref.fills);
    if (fillsBefore !== fillsAfter){ tag.fills = ref.fills; actions.push("fills Tagihan disamakan dgn chip"); }
    // z-order: letakkan rect + teks Tagihan tepat setelah teks chip Token PLN (di depan rect-nya, di bawah Veil)
    const tagRect = smallestRect(frame, tag);
    const kids = frame.children;
    const refIdx = kids.indexOf(ref);
    const tagTextIdx = kids.indexOf(tag);
    const tagRectIdx = tagRect ? kids.indexOf(tagRect) : -1;
    actions.push("z-order sebelum: refTxt@" + refIdx + " tagTxt@" + tagTextIdx + " tagRect@" + tagRectIdx + " dari " + kids.length);
    if (tagRect){
      frame.insertChild(refIdx + 1, tagRect);
      const refIdx2 = frame.children.indexOf(ref);
      frame.insertChild(refIdx2 + 2, tag);
    }
    const kids2 = frame.children;
    actions.push("z-order sesudah: refTxt@" + kids2.indexOf(ref) + " tagTxt@" + kids2.indexOf(tag) + " tagRect@" + (tagRect ? kids2.indexOf(tagRect) : -1));
    report.fixed.push({ id: fid, name: frame.name, actions });
  } catch (e){ report.errors.push({ id: fid, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
