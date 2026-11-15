const STEPS = [
  ["1", "Isi data tujuan", "User ID game, nomor HP, ID pelanggan PLN, atau nomor tagihan — periksa ejaannya, kesalahan penulisan di luar tanggung jawab kami."],
  ["2", "Pilih nominal & pembayaran", "Setiap metode menampilkan harga finalnya sendiri. Tidak ada tambahan biaya setelah ini."],
  ["3", "Selesai dalam detik", "Item masuk otomatis. Bukti dan nomor token tampil di halaman sukses dan dikirim ke kontakmu."],
];
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
const frame = await figma.getNodeByIdAsync("15:2");
const actions = [];
try {
  const texts = frame.findAll(n => n.type === "TEXT");
  const rects = frame.findAll(n => n.type === "RECTANGLE");
  // 1) perbaiki teks tombol hero (ikut tergeser +54 oleh ambang 296)
  const heroBtn = rects.find(r => r.x === 36 && r.width === 118 && r.y >= 280 && r.y <= 300);
  const heroBtnText = texts.find(t => t.characters === "Mulai top up");
  if (heroBtn && heroBtnText){
    const wantY = Math.round(heroBtn.y + 8);
    if (Math.round(heroBtnText.y) !== wantY){ heroBtnText.y = wantY; actions.push("teks 'Mulai top up' -> y=" + wantY); }
    else actions.push("teks 'Mulai top up' sudah benar (lewati)");
  } else { report.errors.push({ id: "15:2", err: "tombol hero hilang" }); }
  // 2) seksi Cara Top Up (lewati bila sudah ada)
  if (texts.find(t => t.characters === "Cara Top Up")){ actions.push("Cara Top Up sudah ada (lewati)"); }
  else {
    const trustBottom = 997; // kartu CS 24/7 berakhir (1063+76+54-196)
    const headerY = trustBottom + 24;
    const trustHeader = texts.find(t => t.characters === "Kenapa Rosdi Store");
    const trustCard = rects.find(r => r.name === "Trust Proses instan");
    const trustTitle = texts.find(t => t.characters === "Proses instan");
    const trustDesc = texts.find(t => t.characters.startsWith("Pesanan diproses otomatis"));
    const src = await figma.getNodeByIdAsync("1:208");
    const numRect = src.findAll(n => n.type === "RECTANGLE").find(r => r.x === 32 && r.y === 1388 && r.width === 24);
    const numText = src.findAll(n => n.type === "TEXT").find(t => t.characters === "6");
    if (!trustHeader || !trustCard || !trustTitle || !trustDesc || !numRect || !numText){ report.errors.push({ id: "15:2", err: "node sumber Cara Top Up hilang" }); }
    else {
      const header = trustHeader.clone(); frame.appendChild(header);
      await loadFont(header); header.characters = "Cara Top Up"; header.y = headerY;
      actions.push("header Cara Top Up @" + headerY);
      let cardY = headerY + 33;
      for (const [num, title, desc] of STEPS){
        const card = trustCard.clone(); frame.appendChild(card);
        card.x = 16; card.y = cardY; card.name = "Cara " + title;
        const nRect = numRect.clone(); frame.appendChild(nRect);
        nRect.resize(24, 24); nRect.x = 37; nRect.y = cardY + 14;
        const nText = numText.clone(); frame.appendChild(nText);
        await loadFont(nText); nText.characters = num;
        nText.textAutoResize = "WIDTH_AND_HEIGHT";
        nText.x = 37 + (24 - nText.width) / 2; nText.y = cardY + 14 + (24 - nText.height) / 2;
        const tTitle = trustTitle.clone(); frame.appendChild(tTitle);
        await loadFont(tTitle); tTitle.characters = title; tTitle.x = 80; tTitle.y = cardY + 14;
        const tDesc = trustDesc.clone(); frame.appendChild(tDesc);
        await loadFont(tDesc); tDesc.characters = desc;
        tDesc.resize(280, 20);
        tDesc.textAutoResize = "HEIGHT";
        tDesc.x = 80; tDesc.y = cardY + 36;
        const cardH = Math.max(76, Math.round(tDesc.y + tDesc.height + 14 - cardY));
        card.resize(card.width, cardH);
        actions.push("kartu '" + title + "' @" + cardY + " h=" + cardH);
        cardY += cardH + 14;
      }
      const needH = cardY - 14 + 24;
      frame.resize(frame.width, needH);
      actions.push("frame tumbuh ke h=" + Math.round(needH));
    }
  }
  report.fixed.push({ id: "15:2", name: frame.name, actions });
} catch (e){ report.errors.push({ id: "15:2", err: e.message }); }
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
