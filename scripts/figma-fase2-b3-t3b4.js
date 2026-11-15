const DEMO_NOTE = "Ini contoh tampilan — bukan transaksi nyata.";
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
const MOBILE = [
  { id: "3:236", noteY: 244, ntY: 272, shiftFrom: 252, shift: 46, card: { x: 16, y: 204, w: 358, h: 306 }, frameH: 560 },
  { id: "3:265", noteY: 244, ntY: 272, shiftFrom: 252, shift: 46, card: { x: 16, y: 204, w: 358, h: 306 }, frameH: 560 },
];
const DESKTOP = [
  { id: "36:2", noteY: 232, ntY: 264, shiftFrom: 238, shift: 56, card: { x: 320, y: 158, w: 640, h: 334 }, footerY: 653, frameH: 863 },
  { id: "36:84", noteY: 232, ntY: 264, shiftFrom: 238, shift: 56, card: { x: 320, y: 158, w: 640, h: 334 }, footerY: 653, frameH: 863 },
];
async function fixMobile(cfg){
  const frame = await figma.getNodeByIdAsync(cfg.id);
  const actions = [];
  const texts = frame.findAll(n => n.type === "TEXT");
  const nodes = frame.findAll(n => n.type === "TEXT" || n.type === "RECTANGLE" || n.type === "ELLIPSE");
  const byText = (s) => texts.find(t => t.characters === s);
  const produkLabel = byText("Produk");
  const produkValue = texts.find(t => t.y === 252 && t.x > 100);
  const subNote = byText("Lacak status pesananmu");
  const cardRect = frame.findAll(n => n.type === "RECTANGLE").find(r => r.x === cfg.card.x && r.y === cfg.card.y && r.width === cfg.card.w);
  if (!produkLabel || !produkValue || !subNote || !cardRect){ report.errors.push({ id: cfg.id, err: "node kunci hilang" }); return; }
  // geser baris + timeline ke bawah (ambang angka tetap, bukan referensi hidup)
  const from = cfg.shiftFrom, sh = cfg.shift, cardBottom = cfg.card.y + cfg.card.h;
  for (const n of nodes){ if (n.y >= from && n.y < cardBottom) n.y += sh; }
  actions.push("baris+timeline +" + sh);
  // catatan demo di atas baris NT
  const note = subNote.clone(); frame.appendChild(note);
  await loadFont(note); note.characters = DEMO_NOTE;
  note.textAutoResize = "WIDTH_AND_HEIGHT";
  note.x = 32; note.y = cfg.noteY;
  actions.push("catatan demo @" + cfg.noteY);
  // baris Nomor transaksi
  const ntLabel = produkLabel.clone(); frame.appendChild(ntLabel);
  await loadFont(ntLabel); ntLabel.characters = "Nomor transaksi"; ntLabel.y = cfg.ntY;
  const ntValue = produkValue.clone(); frame.appendChild(ntValue);
  await loadFont(ntValue); ntValue.characters = "RSD-DEMO1234"; ntValue.y = cfg.ntY;
  actions.push("baris Nomor transaksi @" + cfg.ntY);
  // perbaikan sub timeline
  const subs = [["Nomor transaksi tercatat", "10/11/2026, 04.11"], ["QRIS terkonfirmasi", "Pembayaran: QRIS"], ["Status: Selesai", "Selesai"]];
  for (const [oldS, newS] of subs){
    const t = texts.find(x => x.characters === oldS);
    if (t){ await loadFont(t); t.characters = newS; actions.push("sub '" + oldS + "' -> '" + newS + "'"); }
    else { report.errors.push({ id: cfg.id, err: "sub tidak ditemukan: " + oldS }); }
  }
  // kartu + frame tumbuh
  const lastSubY = 470 + sh; // sub terakhir + tinggi ~13 + jeda 16
  const needCardH = (lastSubY + 13 + 16) - cfg.card.y;
  if (needCardH > cardRect.height){ cardRect.resize(cardRect.width, needCardH); actions.push("kartu tumbuh ke h=" + Math.round(needCardH)); }
  const frameNeed = cfg.card.y + needCardH + 40;
  if (frame.height < frameNeed){ frame.resize(frame.width, frameNeed); actions.push("frame tumbuh ke h=" + Math.round(frameNeed)); }
  report.fixed.push({ id: cfg.id, name: frame.name, actions });
}
async function fixDesktop(cfg){
  const frame = await figma.getNodeByIdAsync(cfg.id);
  const actions = [];
  const texts = frame.findAll(n => n.type === "TEXT");
  const nodes = frame.findAll(n => n.type === "TEXT" || n.type === "RECTANGLE" || n.type === "ELLIPSE");
  const byText = (s) => texts.find(t => t.characters === s);
  const produkLabel = byText("Produk");
  const produkValue = texts.find(t => t.y === 238 && t.x > 600);
  const subtitle = byText("Masukkan nomor transaksi dari halaman sukses");
  const cardRect = frame.findAll(n => n.type === "RECTANGLE").find(r => r.name === "CekCard");
  const histRect = frame.findAll(n => n.type === "RECTANGLE").find(r => r.name === "HistoryCard");
  if (!produkLabel || !produkValue || !subtitle || !cardRect || !histRect){ report.errors.push({ id: cfg.id, err: "node kunci hilang" }); return; }
  const from = cfg.shiftFrom, sh = cfg.shift, cardBottom = cfg.card.y + cfg.card.h;
  for (const n of nodes){ if (n.y >= from && n.y < cardBottom) n.y += sh; }
  actions.push("baris+timeline +" + sh);
  const note = subtitle.clone(); frame.appendChild(note);
  await loadFont(note); note.characters = DEMO_NOTE; note.fontSize = 12.5;
  note.textAutoResize = "WIDTH_AND_HEIGHT";
  note.x = 338; note.y = cfg.noteY;
  actions.push("catatan demo @" + cfg.noteY);
  const ntLabel = produkLabel.clone(); frame.appendChild(ntLabel);
  await loadFont(ntLabel); ntLabel.characters = "Nomor transaksi"; ntLabel.y = cfg.ntY;
  const ntValue = produkValue.clone(); frame.appendChild(ntValue);
  await loadFont(ntValue); ntValue.characters = "RSD-DEMO1234"; ntValue.y = cfg.ntY;
  actions.push("baris Nomor transaksi @" + cfg.ntY);
  // kartu tumbuh (sub terakhir 447+56=503, akhir ~518, +16)
  const needCardH = (447 + sh + 15 + 16) - cfg.card.y;
  const cardDelta = needCardH - cardRect.height;
  if (cardDelta > 0){ cardRect.resize(cardRect.width, needCardH); actions.push("kartu tumbuh +" + cardDelta); }
  // riwayat + footer geser mengikuti kartu
  if (cardDelta > 0){
    for (const n of nodes){ if (n.y >= 506 && n.y < cfg.footerY) n.y += cardDelta; }
    for (const n of nodes){ if (n.y >= cfg.footerY) n.y += cardDelta; }
    actions.push("riwayat+footer +" + cardDelta);
  }
  const frameNeed = cfg.footerY + cardDelta + 210;
  if (frame.height < frameNeed){ frame.resize(frame.width, frameNeed); actions.push("frame tumbuh ke h=" + Math.round(frameNeed)); }
  report.fixed.push({ id: cfg.id, name: frame.name, actions });
}
for (const cfg of MOBILE){ try { await fixMobile(cfg); } catch (e){ report.errors.push({ id: cfg.id, err: e.message }); } }
for (const cfg of DESKTOP){ try { await fixDesktop(cfg); } catch (e){ report.errors.push({ id: cfg.id, err: e.message }); } }
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
