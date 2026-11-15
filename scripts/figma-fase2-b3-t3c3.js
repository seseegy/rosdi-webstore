const HERO_SUB = "Game, pulsa, paket data, token PLN, tagihan pascabayar, dan e-wallet dalam satu tempat. Harga final terlihat sebelum kamu membayar — tidak ada biaya siluman.";
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
  const nodes = frame.findAll(n => n.type === "TEXT" || n.type === "RECTANGLE" || n.type === "ELLIPSE");
  const byText = (s) => texts.find(t => t.characters === s);
  const sub = texts.find(t => t.characters.startsWith("MLBB, Free Fire"));
  const heroCard = rects.find(r => r.x === 16 && r.y === 140 && r.width === 358);
  const heroBtn = rects.find(r => r.x === 36 && r.y === 252 && r.width === 118);
  const heroBtnText = byText("Mulai top up");
  if (!sub || !heroCard || !heroBtn || !heroBtnText){ report.errors.push({ id: "15:2", err: "node hero hilang" }); }
  else {
    // 1) hero sub -> teks kode (ukur tinggi aktual)
    await loadFont(sub);
    sub.characters = HERO_SUB;
    sub.resize(300, 20);
    sub.textAutoResize = "HEIGHT";
    const subBottom = Math.round(sub.y + sub.height);
    const btnY = subBottom + 12;
    heroBtn.y = btnY;
    heroBtnText.y = btnY + 8;
    const newCardBottom = btnY + 30 + 16;
    const heroDelta = newCardBottom - 280;
    heroCard.resize(heroCard.width, newCardBottom - 140);
    actions.push("hero sub h=" + Math.round(sub.height) + ", tombol -> y=" + btnY + ", kartu tumbuh +" + heroDelta);
    // geser semua di bawah hero (+heroDelta)
    for (const n of nodes){ if (n.y >= 296) n.y += heroDelta; }
    actions.push("konten bawah hero +" + heroDelta);
    // 2) hapus seksi Flash Sale (header 348..kartu 520, sudah +heroDelta)
    const flashTop = 348 + heroDelta, flashBottom = 520 + heroDelta;
    const belowFlash = 544 + heroDelta;
    // tangkap daftar geser DULU (node flash tidak masuk: di bawah ambang), baru hapus
    const toShift = nodes.filter(n => n.y >= belowFlash);
    const toRemove = nodes.filter(n => n.y >= flashTop && n.y <= flashBottom);
    for (const n of toRemove) n.remove();
    actions.push("Flash Sale dihapus: " + toRemove.length + " node");
    for (const n of toShift) n.y -= 196;
    actions.push("konten bawah flash -196");
    // 3) tambah seksi Cara Top Up setelah kartu trust terakhir (CS 24/7 berakhir 1139+heroDelta-196)
    const trustBottom = 1139 + heroDelta - 196;
    const headerY = trustBottom + 24;
    // ambil ulang (array lama basi: berisi node flash yang sudah dihapus)
    const texts2 = frame.findAll(n => n.type === "TEXT");
    const rects2 = frame.findAll(n => n.type === "RECTANGLE");
    const trustHeader = texts2.find(t => t.characters === "Kenapa Rosdi Store");
    const trustCard = rects2.find(r => r.name === "Trust Proses instan");
    const trustIcon = rects2.find(r => r.name === "Ikon Proses instan");
    const trustTitle = texts2.find(t => t.characters === "Proses instan");
    const trustDesc = texts2.find(t => t.characters.startsWith("Pesanan diproses otomatis"));
    // nomor langkah: klon dari frame checkout 1:208 (lingkaran 24x24 + angka)
    const src = await figma.getNodeByIdAsync("1:208");
    const numRect = src.findAll(n => n.type === "RECTANGLE").find(r => r.x === 32 && r.y === 1388 && r.width === 24);
    const numText = src.findAll(n => n.type === "TEXT").find(t => t.characters === "6");
    if (!trustHeader || !trustCard || !trustIcon || !trustTitle || !trustDesc || !numRect || !numText){ report.errors.push({ id: "15:2", err: "node sumber Cara Top Up hilang" }); }
    else {
      const header = trustHeader.clone(); frame.appendChild(header);
      await loadFont(header); header.characters = "Cara Top Up"; header.y = headerY;
      actions.push("header Cara Top Up @" + headerY);
      let cardY = headerY + 33;
      for (const [num, title, desc] of STEPS){
        const card = trustCard.clone(); frame.appendChild(card);
        card.x = 16; card.y = cardY; card.name = "Cara " + title;
        // lingkaran nomor menggantikan ikon trust
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
      // frame tumbuh (kartu terakhir + 24)
      const needH = cardY - 14 + 24;
      frame.resize(frame.width, needH);
      actions.push("frame tumbuh ke h=" + Math.round(needH));
    }
  }
  report.fixed.push({ id: "15:2", name: frame.name, actions });
} catch (e){ report.errors.push({ id: "15:2", err: e.message }); }
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
