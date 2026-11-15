// Fase 2 B3 Tier 3a — chip & footer (s462-4, s464-4, s464-5, s466-1):
// (a) sisip chip "Tagihan" setelah chip "Token PLN" di semua baris chip
//     Beranda (desktop 20:2/21:2 + mobile + snapshot modal + search);
// (b) pisah chip "Pulsa & Data" jadi "Pulsa" + "Paket Data" (12 node);
// (c) tambah tautan footer "Tagihan Pascabayar" di kolom Produk desktop.
// Chip = RECTANGLE + TEXT (teks offset +13,+9 dari rect). Rect baru =
// lebar teks + 26; gap antar chip 8px; chip sesudahnya digeser kanan.
const out = { chips: [], footer: [] };
async function loadFontOf(t) {
  try { await figma.loadFontAsync(t.fontName); }
  catch (e) {
    const segs = t.getStyledTextSegments(["fontName"]);
    for (const s of segs) await figma.loadFontAsync(s.fontName);
  }
}
// Pasangan chip (rect + teks) dalam satu frame, urut x. Rect = RECTANGLE
// terkecil yang memuat titik tengah teks.
function chipPairs(frame) {
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) =>
    ["Semua", "Top Up Game", "Pulsa", "Paket Data", "Pulsa & Data", "Token PLN", "Tagihan", "E-Wallet", "Voucher"].includes(t.characters.trim()));
  return texts.map((t) => {
    const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
    const rects = frame.children.filter((c) => c.type === "RECTANGLE" &&
      c.x <= cx && cx <= c.x + c.width && c.y <= cy && cy <= c.y + c.height);
    rects.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    return { text: t, rect: rects[0] || null };
  }).filter((p) => p.rect).sort((a, b) => a.rect.x - b.rect.x);
}
async function setChipText(pair, label) {
  await loadFontOf(pair.text);
  pair.text.textAutoResize = "WIDTH_AND_HEIGHT";
  pair.text.characters = label;
  const w = Math.round(pair.text.width) + 26;
  pair.rect.resize(w, pair.rect.height);
  pair.text.x = pair.rect.x + 13;
  pair.text.y = pair.rect.y + 9;
  return w;
}
async function cloneChip(pair, label, x) {
  const rect = pair.rect.clone();
  const text = pair.text.clone();
  await loadFontOf(text);
  text.textAutoResize = "WIDTH_AND_HEIGHT";
  text.characters = label;
  const w = Math.round(text.width) + 26;
  rect.resize(w, rect.height);
  rect.x = x; rect.y = pair.rect.y;
  text.x = x + 13; text.y = pair.rect.y + 9;
  return { text, rect, w };
}
// --- (a)+(b): semua frame yang punya chip "Pulsa & Data" atau "Token PLN" ---
const frames = new Map();
for (const t of figma.root.findAllWithCriteria({ types: ["TEXT"] })) {
  if (t.characters.trim() === "Pulsa & Data" || t.characters.trim() === "Token PLN") {
    let p = t.parent;
    while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") { frames.set(p.id, p); break; } p = p.parent; }
  }
}
for (const frame of frames.values()) {
  const log = { frame: frame.name, id: frame.id, actions: [] };
  let pairs = chipPairs(frame);
  const byLabel = (l) => pairs.find((p) => p.text.characters.trim() === l);
  // (b) pisah "Pulsa & Data"
  const pd = byLabel("Pulsa & Data");
  if (pd) {
    const oldW = pd.rect.width;
    const newW = await setChipText(pd, "Pulsa");
    let shift = (newW - oldW);
    const idx = pairs.indexOf(pd);
    // sisip "Paket Data" setelah "Pulsa"
    const paket = await cloneChip(pd, "Paket Data", pd.rect.x + newW + 8);
    frame.appendChild(paket.rect); frame.appendChild(paket.text);
    shift += paket.w + 8;
    for (let i = idx + 1; i < pairs.length; i++) {
      pairs[i].rect.x += shift;
      pairs[i].text.x += shift;
    }
    log.actions.push("Pulsa&Data -> Pulsa + Paket Data (geser +" + Math.round(shift) + ")");
    pairs = chipPairs(frame);
  }
  // (a) sisip "Tagihan" setelah "Token PLN" (bila belum ada)
  if (!byLabel("Tagihan")) {
    const tpln = byLabel("Token PLN");
    if (tpln) {
      const idx = pairs.indexOf(tpln);
      const tag = await cloneChip(tpln, "Tagihan", tpln.rect.x + tpln.rect.width + 8);
      frame.appendChild(tag.rect); frame.appendChild(tag.text);
      const shift = tag.w + 8;
      for (let i = idx + 1; i < pairs.length; i++) {
        pairs[i].rect.x += shift;
        pairs[i].text.x += shift;
      }
      log.actions.push("Tagihan disisip setelah Token PLN (geser +" + Math.round(shift) + ")");
    } else log.actions.push("SKIP Tagihan: chip Token PLN tidak ketemu");
  } else log.actions.push("Tagihan sudah ada");
  out.chips.push(log);
}
// --- (c): tautan footer "Tagihan Pascabayar" ---
const footByFrame = new Map();
for (const t of figma.root.findAllWithCriteria({ types: ["TEXT"] })) {
  if (t.name.startsWith("FootProduk ")) {
    let p = t.parent;
    while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") { if (!footByFrame.has(p.id)) footByFrame.set(p.id, { frame: p, links: [] }); footByFrame.get(p.id).links.push(t); break; } p = p.parent; }
  }
}
for (const { frame, links } of footByFrame.values()) {
  const log = { frame: frame.name, id: frame.id };
  if (links.some((t) => t.characters.trim() === "Tagihan Pascabayar")) { log.action = "sudah ada"; out.footer.push(log); continue; }
  links.sort((a, b) => a.y - b.y);
  const last = links[links.length - 1];
  const bg = frame.findAllWithCriteria({ types: ["RECTANGLE"] }).find((r) => r.name === "FooterBg");
  const newY = last.y + 24;
  if (bg && newY + 15 > bg.y + bg.height - 8) { log.action = "SKIP: ruang footer tidak cukup (bg bawah " + Math.round(bg.y + bg.height) + ")"; out.footer.push(log); continue; }
  const clone = last.clone();
  await loadFontOf(clone);
  clone.textAutoResize = "WIDTH_AND_HEIGHT";
  clone.characters = "Tagihan Pascabayar";
  clone.name = "FootProduk Tagihan Pascabayar";
  clone.x = last.x; clone.y = newY;
  frame.appendChild(clone);
  log.action = "ditambah di y=" + Math.round(newY);
  out.footer.push(log);
}
return out;
