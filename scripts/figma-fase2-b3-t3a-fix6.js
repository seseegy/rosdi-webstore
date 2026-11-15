const IDS = ["1:2","1:105"];
const ORDER = ["Semua","Top Up Game","Pulsa","Paket Data","Token PLN","Tagihan","E-Wallet","Voucher"];
const report = { fixed: [], errors: [] };
for (const fid of IDS){
  let frame;
  try { frame = await figma.getNodeByIdAsync(fid); } catch (e) { report.errors.push({ id: fid, err: "getNode: " + e.message }); continue; }
  if (!frame){ report.errors.push({ id: fid, err: "null" }); continue; }
  const actions = [];
  try {
    const tag = frame.findAll(n => n.type === "TEXT" && n.characters === "Tagihan")[0];
    const ref = frame.findAll(n => n.type === "TEXT" && n.characters === "Token PLN" && n.fontName.style === "Medium")[0];
    if (!tag || !ref){ report.errors.push({ id: fid, err: "tag/ref missing" }); continue; }
    // rect Tagihan yang tertinggal: di baris y=296, x 540-560, lebar ~82 (tumpang tindih dgn E-Wallet)
    const cands = frame.findAll(n => n.type === "RECTANGLE" && Math.abs(n.y - 296) <= 2 && n.x >= 545 && n.x <= 550 && n.width >= 80 && n.width <= 84);
    if (cands.length !== 1){ report.errors.push({ id: fid, err: "tag rect candidates: " + cands.length }); continue; }
    const tagRect = cands[0];
    actions.push("tagRect ditemukan di (" + Math.round(tagRect.x) + "," + Math.round(tagRect.y) + ") " + Math.round(tagRect.width) + "x" + Math.round(tagRect.height));
    tagRect.resize(Math.ceil(tag.width) + 26, 34);
    tagRect.x = 469; tagRect.y = 296;
    tag.x = 482; tag.y = 305;
    actions.push("tagRect -> (469,296) " + Math.round(tagRect.width) + "x34; tag text -> (482,305)");
    // z-order: rect + teks tepat setelah teks chip Token PLN
    const refIdx = frame.children.indexOf(ref);
    frame.insertChild(refIdx + 1, tagRect);
    const refIdx2 = frame.children.indexOf(ref);
    frame.insertChild(refIdx2 + 2, tag);
    const kids = frame.children;
    actions.push("z-order: refTxt@" + kids.indexOf(ref) + " tagRect@" + kids.indexOf(tagRect) + " tagTxt@" + kids.indexOf(tag));
    report.fixed.push({ id: fid, name: frame.name, actions });
  } catch (e){ report.errors.push({ id: fid, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
