const ITEMS = [
  { name: "Membership Mingguan", meta: "450 DM selama 7 hari", price: "Rp29.000", x: 32, y: 342 },
  { name: "Booyah Pass", meta: "Pass musim berjalan", price: "Rp45.000", x: 200, y: 342 },
  { name: "Membership Bulanan", meta: "2600 DM selama 30 hari", price: "Rp89.000", x: 32, y: 420 },
];
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
const FRAMES = [
  { src: "111:2", x: 940, name: "Free Fire — Membership — Light" },
  { src: "111:139", x: 1410, name: "Free Fire — Membership — Dark" },
];
for (const cfg of FRAMES){
  let frame;
  try {
    const srcFrame = await figma.getNodeByIdAsync(cfg.src);
    frame = srcFrame.clone();
    frame.x = cfg.x; frame.y = srcFrame.y; frame.name = cfg.name;
  } catch (e){ report.errors.push({ id: cfg.src, err: "clone: " + e.message }); continue; }
  const actions = [];
  try {
    const texts = frame.findAll(n => n.type === "TEXT");
    const rects = frame.findAll(n => n.type === "RECTANGLE");
    const byText = (s) => texts.find(t => t.characters === s);
    // template kartu nominal (klon DULU sebelum hapus)
    const tplCard = rects.find(r => r.name === "FF 5 Diamonds");
    const tplName = byText("5 Diamonds");
    const tplPrice = byText("Rp1.000");
    const tplMeta = byText("Contoh penulisan: 12345678.");
    const dTab = rects.find(r => r.x === 32 && r.y === 300);
    const mTab = rects.find(r => r.name === "Tab Membership");
    const dTxt = byText("Diamonds");
    const mTxt = byText("Membership");
    const step2 = rects.find(r => r.x === 16 && r.y === 248 && r.width === 358);
    if (!tplCard || !tplName || !tplPrice || !tplMeta || !dTab || !mTab || !dTxt || !mTxt || !step2){ report.errors.push({ id: cfg.src, err: "node template hilang" }); continue; }
    // 1) tukar gaya tab (aktif <-> nonaktif)
    const dFills = JSON.parse(JSON.stringify(dTab.fills)), dStrokes = JSON.parse(JSON.stringify(dTab.strokes)), dW = dTab.strokeWeight;
    dTab.fills = JSON.parse(JSON.stringify(mTab.fills)); dTab.strokes = JSON.parse(JSON.stringify(mTab.strokes)); dTab.strokeWeight = mTab.strokeWeight;
    mTab.fills = dFills; mTab.strokes = dStrokes; mTab.strokeWeight = dW;
    const dTxtFills = JSON.parse(JSON.stringify(dTxt.fills));
    dTxt.fills = JSON.parse(JSON.stringify(mTxt.fills));
    mTxt.fills = dTxtFills;
    actions.push("tab Membership aktif, Diamonds nonaktif");
    // 2) buat 3 kartu Membership dari template
    for (const it of ITEMS){
      const card = tplCard.clone(); frame.appendChild(card);
      card.name = "FF " + it.name; card.resize(158, 70); card.x = it.x; card.y = it.y;
      const nm = tplName.clone(); frame.appendChild(nm);
      await loadFont(nm); nm.characters = it.name; nm.x = it.x + 12; nm.y = it.y + 8;
      const mt = tplMeta.clone(); frame.appendChild(mt);
      await loadFont(mt); mt.characters = it.meta; mt.fontSize = 10.5;
      mt.textAutoResize = "WIDTH_AND_HEIGHT";
      mt.x = it.x + 12; mt.y = it.y + 26;
      const pr = tplPrice.clone(); frame.appendChild(pr);
      await loadFont(pr); pr.characters = it.price; pr.x = it.x + 12; pr.y = it.y + 44;
      actions.push("kartu '" + it.name + "' @" + it.x + "," + it.y);
    }
    // 3) hapus 8 kartu Diamonds + badge + teks grid (ambil ulang, lalu hapus)
    const texts2 = frame.findAll(n => n.type === "TEXT");
    const rects2 = frame.findAll(n => n.type === "RECTANGLE");
    const nodes2 = frame.findAll(n => n.type === "TEXT" || n.type === "RECTANGLE" || n.type === "ELLIPSE");
    const toRemove = nodes2.filter(n => {
      if (n.type === "RECTANGLE" && (n.name.startsWith("FF ") || n.name.startsWith("FFBadge"))) return true;
      if (n.type === "TEXT" && n.y >= 342 && n.y <= 582 && n.x >= 32 && n.x <= 358){
        // kecualikan teks kartu Membership yang baru dibuat
        for (const it of ITEMS){ if (n.characters === it.name || n.characters === it.meta || n.characters === it.price) return false; }
        return true;
      }
      return false;
    });
    // jangan hapus kartu Membership yang baru dibuat (nama "FF Membership..." / "FF Booyah Pass")
    const keep = new Set();
    for (const it of ITEMS) keep.add("FF " + it.name);
    const finalRemove = toRemove.filter(n => !(n.type === "RECTANGLE" && keep.has(n.name)));
    for (const n of finalRemove) n.remove();
    actions.push("8 kartu Diamonds + badge dihapus: " + finalRemove.length + " node");
    // 4) kartu Step 2 menyusut (grid berakhir 490) + konten bawah naik 104
    const newStep2H = 490 + 16 - 248;
    const delta = step2.height - newStep2H;
    step2.resize(step2.width, newStep2H);
    actions.push("Step2 menyusut ke h=" + newStep2H + " (delta " + delta + ")");
    const nodes3 = frame.findAll(n => n.type === "TEXT" || n.type === "RECTANGLE" || n.type === "ELLIPSE");
    for (const n of nodes3){ if (n.y >= 626) n.y -= delta; }
    actions.push("konten bawah -" + delta);
    frame.resize(frame.width, frame.height - delta);
    actions.push("frame menyusut ke h=" + Math.round(frame.height));
    report.fixed.push({ id: cfg.src, name: frame.name, actions });
  } catch (e){ report.errors.push({ id: cfg.src, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
