// Read-only probe lanjutan Siklus 431 (tindak lanjut probe 1).
// A: hitung nominal per frame game via rentang y Langkah 2 (antara judul
//    "Pilih Nominal" dan judul langkah berikutnya) — nama + harga Rp.
// B: progress flash Beranda: node apa pun tinggi 6px / bernama *rogress*.
// C: teks modal S&K frame 10:2 (cari "Syarat"/"Ketentuan"/"1x24"/"Tutup").
// D: lebar kartu konten Cek Desktop 36:2 (x≈320, w≈640?).
// E: daftar lengkap 22 teks "beku" + fontSize-nya.
const byId = {};
for (const f of figma.currentPage.children) byId[f.id] = f;
const out = { nominalRange: {}, progress: [], modalSK: [], cekCard: [], frozen: [] };
const GAME_FRAMES = { "1:208": "MLBB", "111:2": "Free Fire", "6:2": "Genshin", "114:2": "PUBG", "116:2": "HoK", "120:2": "Roblox" };
for (const [fid, label] of Object.entries(GAME_FRAMES)) {
  const frame = byId[fid];
  const fb = frame.absoluteBoundingBox;
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] });
  const rel = texts.map((t) => ({ chars: t.characters.trim(), y: +(t.absoluteBoundingBox.y - fb.y).toFixed(1), h: +t.height.toFixed(1) }));
  const step2 = rel.find((t) => t.chars === "Pilih Nominal");
  // judul langkah berikutnya setelah step2: "Jumlah Pembelian" atau "Pilih Pembayaran"
  const after = rel.filter((t) => t.y > (step2 ? step2.y : 0) && (t.chars === "Jumlah Pembelian" || t.chars === "Pilih Pembayaran")).sort((a, b) => a.y - b.y)[0];
  const y0 = step2 ? step2.y : 0;
  const y1 = after ? after.y : 99999;
  const inRange = rel.filter((t) => t.y > y0 && t.y < y1);
  const prices = inRange.filter((t) => /^Rp[\d.]+$/.test(t.chars)).map((t) => t.chars);
  const names = inRange.filter((t) => !/^Rp/.test(t.chars) && t.chars.length > 2 && !/^(Terlaris|-\d+%|Flash sale)$/.test(t.chars)).map((t) => t.chars);
  out.nominalRange[label] = { step2y: y0, nextY: y1, priceCount: prices.length, prices, names };
}
// B
{
  const frame = byId["1:2"];
  const fb = frame.absoluteBoundingBox;
  const walk = (n) => {
    if ((n.height === 6 || /rogress/i.test(n.name)) && n.absoluteBoundingBox) {
      const b = n.absoluteBoundingBox;
      out.progress.push({ type: n.type, name: n.name.slice(0, 30), x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +n.width.toFixed(1), h: +n.height.toFixed(1) });
    }
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(frame);
}
// C
{
  const frame = byId["10:2"];
  const fb = frame.absoluteBoundingBox;
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] });
  out.modalSK = texts.filter((t) => /Syarat|Ketentuan|1x24|Tutup|dikembalikan|dibatalkan/.test(t.characters))
    .map((t) => ({ chars: t.characters.slice(0, 120), y: +(t.absoluteBoundingBox.y - fb.y).toFixed(1), h: +t.height.toFixed(1) }));
  out.modalSKTotal = texts.length;
}
// D
{
  const frame = byId["36:2"];
  const fb = frame.absoluteBoundingBox;
  const walk = (n) => {
    if ((n.type === "RECT" || n.type === "FRAME") && Math.abs(n.width - 640) < 3 && n.absoluteBoundingBox) {
      const b = n.absoluteBoundingBox;
      out.cekCard.push({ name: n.name.slice(0, 30), x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +n.width.toFixed(1), h: +n.height.toFixed(1) });
    }
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(frame);
}
// E
for (const frame of figma.currentPage.children) {
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    if ((t.height <= 10.5 && t.characters.length > 5) || (t.height < 12 && t.characters.length > 60)) {
      let fs = null;
      try { fs = t.fontSize; } catch { fs = "mixed"; }
      out.frozen.push({ frame: frame.name, id: t.id, h: +t.height.toFixed(1), fs, chars: t.characters.slice(0, 50) });
    }
  }
}
return out;
