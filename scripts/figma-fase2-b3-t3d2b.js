const OPS = [
  { id: "byu", name: "by.U", initials: "BU", color: { r: 0.118, g: 0.227, b: 0.541 }, phone: "0851 3456 7890", x: 3760, pkgs: [
    ["Kuota by.U 5GB", "Kuota utama 5GB · 30 hari", "Rp20.000"], ["Kuota by.U 10GB", "Kuota utama 10GB · 30 hari", "Rp35.000"],
    ["Kuota by.U 20GB", "Kuota utama 20GB · 30 hari", "Rp55.000"], ["Kuota by.U 2GB", "Kuota utama 2GB · 7 hari", "Rp9.000"],
    ["Kuota by.U 40GB", "Kuota utama 40GB · 30 hari", "Rp85.000"], ["Kuota by.U 100GB", "Kuota utama 100GB · 30 hari", "Rp139.000"],
    ["Kuota Malam by.U 20GB", "Kuota malam 20GB · 30 hari (00.00–07.00)", "Rp25.000"], ["Kuota Lokal by.U 15GB", "Kuota lokal 15GB · 30 hari", "Rp32.000"],
    ["Kuota by.U Mingguan 3GB", "Kuota utama 3GB · 7 hari", "Rp12.000"], ["Unlimited by.U 30 Hari", "Kuota utama 10GB + unlimited aplikasi · 30 hari", "Rp99.000"] ] },
  { id: "axis", name: "Axis", initials: "AX", color: { r: 0.486, g: 0.227, b: 0.929 }, phone: "0838 3456 7890", x: 4700, pkgs: [
    ["Bronet 8GB", "Kuota utama 8GB · 30 hari", "Rp26.000"], ["Bronet 16GB", "Kuota utama 16GB · 30 hari", "Rp42.000"],
    ["Bronet Owsem 32GB", "Kuota utama + kuota aplikasi 32GB · 30 hari", "Rp64.000"], ["Bronet 4GB", "Kuota utama 4GB · 30 hari", "Rp15.000"],
    ["Bronet 64GB", "Kuota utama 64GB · 30 hari", "Rp99.000"], ["Bronet Owsem 100GB", "Kuota utama + kuota aplikasi 100GB · 30 hari", "Rp139.000"],
    ["Bronet Malam 20GB", "Kuota malam 20GB · 30 hari (00.00–07.00)", "Rp23.000"], ["Bronet Lokal 12GB", "Kuota lokal 12GB · 30 hari", "Rp30.000"],
    ["Bronet Mingguan 5GB", "Kuota utama 5GB · 7 hari", "Rp18.000"], ["Bronet Unlimited 30 Hari", "Kuota utama 10GB + unlimited aplikasi · 30 hari", "Rp79.000"] ] },
  { id: "smartfren", name: "Smartfren", initials: "SF", color: { r: 0.745, g: 0.094, b: 0.365 }, phone: "0881 3456 7890", x: 5640, pkgs: [
    ["Unlimited Nonstop 12GB", "Kuota utama 12GB, lalu unlimited · 30 hari", "Rp36.000"], ["Unlimited Nonstop 30GB", "Kuota utama 30GB, lalu unlimited · 30 hari", "Rp58.000"],
    ["Gokil Max 9GB", "Kuota utama 9GB · 30 hari", "Rp24.000"], ["Gokil Max 3GB", "Kuota utama 3GB · 7 hari", "Rp12.000"],
    ["Gokil Max 24GB", "Kuota utama 24GB · 30 hari", "Rp52.000"], ["Unlimited Malam 20GB", "Kuota malam 20GB · 30 hari (00.00–07.00)", "Rp22.000"],
    ["Unlimited Lokal 15GB", "Kuota lokal 15GB · 30 hari", "Rp34.000"], ["Gokil Max Mingguan 6GB", "Kuota utama 6GB · 7 hari", "Rp18.000"],
    ["Unlimited Nonstop 60GB", "Kuota utama 60GB, lalu unlimited · 30 hari", "Rp89.000"], ["Unlimited Nonstop 100GB", "Kuota utama 100GB, lalu unlimited · 30 hari", "Rp129.000"] ] },
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
