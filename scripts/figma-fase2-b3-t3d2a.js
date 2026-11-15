const OPS = [
  { id: "indosat", name: "Indosat", initials: "IS", color: { r: 0.706, g: 0.325, b: 0.035 }, phone: "0815 3456 7890", x: 940, pkgs: [
    ["Freedom Internet 16GB", "Kuota utama 16GB · 30 hari", "Rp42.000"], ["Freedom Internet 30GB", "Kuota utama 30GB · 30 hari", "Rp66.000"],
    ["Freedom Mini 7GB", "Kuota utama 7GB · 7 hari", "Rp23.000"], ["Freedom Internet 5GB", "Kuota utama 5GB · 30 hari", "Rp17.000"],
    ["Freedom Internet 50GB", "Kuota utama 50GB · 30 hari", "Rp95.000"], ["Freedom Mini 3GB", "Kuota utama 3GB · 3 hari", "Rp12.000"],
    ["Freedom Malam 25GB", "Kuota malam 25GB · 30 hari (00.00–07.00)", "Rp27.000"], ["Freedom Lokal 20GB", "Kuota lokal 20GB · 30 hari", "Rp45.000"],
    ["Freedom Games 10GB", "Kuota game 10GB · 30 hari", "Rp33.000"], ["Freedom Unlimited 30 Hari", "Kuota utama 10GB + unlimited aplikasi · 30 hari", "Rp89.000"] ] },
  { id: "xl", name: "XL", initials: "XL", color: { r: 0.145, g: 0.388, b: 0.918 }, phone: "0817 3456 7890", x: 1880, pkgs: [
    ["Xtra Combo 20GB", "Kuota utama 20GB · 30 hari", "Rp57.000"], ["Xtra Combo 10GB", "Kuota utama 10GB · 30 hari", "Rp38.000"],
    ["Xtra Harian 3GB", "Kuota utama 3GB · 3 hari", "Rp12.000"], ["Xtra Combo 5GB", "Kuota utama 5GB · 30 hari", "Rp19.000"],
    ["Xtra Combo 40GB", "Kuota utama 40GB · 30 hari", "Rp89.000"], ["Xtra Combo 100GB", "Kuota utama 100GB · 30 hari", "Rp149.000"],
    ["Xtra Malam 20GB", "Kuota malam 20GB · 30 hari (00.00–07.00)", "Rp24.000"], ["Xtra Lokal 15GB", "Kuota lokal 15GB · 30 hari", "Rp36.000"],
    ["Xtra Mingguan 7GB", "Kuota utama 7GB · 7 hari", "Rp22.000"], ["Xtra Unlimited 30 Hari", "Kuota utama 10GB + unlimited aplikasi · 30 hari", "Rp95.000"] ] },
  { id: "tri", name: "Tri", initials: "3", color: { r: 0.059, g: 0.463, b: 0.431 }, phone: "0896 3456 7890", x: 2820, pkgs: [
    ["Happy 18GB", "Kuota utama 18GB · 30 hari", "Rp43.000"], ["Happy 9GB", "Kuota utama 9GB · 30 hari", "Rp28.000"],
    ["Happy 45GB", "Kuota utama 45GB · 30 hari", "Rp72.000"], ["Happy 3GB", "Kuota utama 3GB · 7 hari", "Rp11.000"],
    ["Happy 100GB", "Kuota utama 100GB · 30 hari", "Rp129.000"], ["Happy Malam 20GB", "Kuota malam 20GB · 30 hari (00.00–07.00)", "Rp24.000"],
    ["Happy Lokal 15GB", "Kuota lokal 15GB · 30 hari", "Rp33.000"], ["Happy Mingguan 6GB", "Kuota utama 6GB · 7 hari", "Rp19.000"],
    ["Happy Streaming 12GB", "Kuota streaming 12GB · 30 hari", "Rp36.000"], ["Happy Unlimited 30 Hari", "Kuota utama 10GB + unlimited aplikasi · 30 hari", "Rp85.000"] ] },
];
const report = { fixed: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
function rp(n){ return "Rp" + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
for (const op of OPS){
  for (const mode of [{ src: "41:2", suf: "Light" }, { src: "41:94", suf: "Dark" }]){
    let frame;
    try {
      const srcFrame = await figma.getNodeByIdAsync(mode.src);
      frame = srcFrame.clone();
      frame.x = op.x + (mode.suf === "Dark" ? 470 : 0); frame.y = srcFrame.y;
      frame.name = "Paket Data " + op.name + " — " + mode.suf;
    } catch (e){ report.errors.push({ id: op.id + "-" + mode.suf, err: "clone: " + e.message }); continue; }
    const actions = [];
    try {
      const texts = frame.findAll(n => n.type === "TEXT");
      const rects = frame.findAll(n => n.type === "RECTANGLE");
      const byText = (s) => texts.find(t => t.characters === s);
      // judul + tile + nomor + catatan terdeteksi
      const title = byText("Paket Data Telkomsel");
      const tile = byText("TS");
      const tileRect = rects.find(r => r.x === 48 && r.y === 14 && r.width === 36);
      const phone = byText("0812 3456 7890");
      const note = byText("Operator terdeteksi: Telkomsel");
      if (!title || !tile || !tileRect || !phone || !note){ report.errors.push({ id: op.id + "-" + mode.suf, err: "node header hilang" }); continue; }
      await loadFont(title); title.characters = "Paket Data " + op.name;
      await loadFont(tile); tile.characters = op.initials;
      tileRect.fills = [{ type: "SOLID", color: op.color }];
      await loadFont(phone); phone.characters = op.phone;
      await loadFont(note); note.characters = "Operator terdeteksi: " + op.name + ".";
      actions.push("header " + op.name + " (" + op.initials + ", " + op.phone + ")");
      // kartu paket: kumpulkan 10 kartu (urut y lalu x) + 3 teks tiap kartu
      const cardRects = rects.filter(r => r.name.startsWith("Paket ")).sort((a,b) => a.y - b.y || a.x - b.x);
      if (cardRects.length !== 10){ report.errors.push({ id: op.id + "-" + mode.suf, err: "kartu paket: " + cardRects.length }); continue; }
      const cards = cardRects.map(cr => {
        const ts = texts.filter(t => t.x >= cr.x && t.x < cr.x + cr.width && t.y >= cr.y && t.y < cr.y + cr.height).sort((a,b) => a.y - b.y);
        return { rect: cr, name: ts[0], meta: ts[1], price: ts[2] };
      });
      if (cards.some(c => !c.name || !c.meta || !c.price)){ report.errors.push({ id: op.id + "-" + mode.suf, err: "teks kartu tidak lengkap" }); continue; }
      // isi + ukur + tata ulang per baris (2 kartu/baris)
      let rowY = 294;
      for (let row = 0; row < 5; row++){
        let rowH = 0;
        for (let col = 0; col < 2; col++){
          const i = row * 2 + col;
          const c = cards[i], pkg = op.pkgs[i];
          const cardX = 32 + col * 168;
          await loadFont(c.name); c.name.characters = pkg[0];
          c.name.resize(132, 20); c.name.textAutoResize = "HEIGHT";
          await loadFont(c.meta); c.meta.characters = pkg[1];
          c.meta.resize(132, 20); c.meta.textAutoResize = "HEIGHT";
          await loadFont(c.price); c.price.characters = pkg[2];
          // posisi: nama +12, meta setelah nama +1, harga setelah meta +6
          c.name.x = cardX + 13; c.name.y = rowY + 12;
          c.meta.x = cardX + 13; c.meta.y = Math.round(c.name.y + c.name.height + 1);
          c.price.x = cardX + 13; c.price.y = Math.round(c.meta.y + c.meta.height + 6);
          const h = Math.round(c.price.y + c.price.height + 12 - rowY);
          c.rect.resize(158, h); c.rect.x = cardX; c.rect.y = rowY;
          c.rect.name = "Paket " + pkg[0];
          rowH = Math.max(rowH, h);
        }
        actions.push("baris " + (row + 1) + " @" + rowY + " h=" + rowH);
        rowY += rowH + 10;
      }
      // kartu Step 2 menyusut/tumbuh + konten bawah geser
      const step2 = rects.find(r => r.x === 16 && r.y === 238 && r.width === 358);
      const gridBottom = rowY - 10;
      const newStep2H = gridBottom + 16 - 238;
      const delta = newStep2H - step2.height;
      step2.resize(step2.width, newStep2H);
      const nodes = frame.findAll(n => n.type === "TEXT" || n.type === "RECTANGLE" || n.type === "ELLIPSE");
      // ambang: konten di bawah Step 2 (kartu Step 2 berakhir 854 semula) — pakai y>=870
      for (const n of nodes){ if (n.y >= 870) n.y += delta; }
      frame.resize(frame.width, frame.height + delta);
      actions.push("Step2 h=" + newStep2H + " (delta " + delta + "), frame h=" + Math.round(frame.height));
      report.fixed.push({ id: op.id + "-" + mode.suf, name: frame.name, actions });
    } catch (e){ report.errors.push({ id: op.id + "-" + mode.suf, err: e.message }); }
  }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
