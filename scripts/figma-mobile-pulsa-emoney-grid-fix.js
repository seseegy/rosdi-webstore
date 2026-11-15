// Siklus 52: sinkron frame mobile Pulsa (2:2/2:59) & E-Wallet (3:2/3:60) vs kode.
// CACAT (temuan probe read-only siklus ini):
//  - Grid nominal 3 kolom (sel 104px), padahal .nom-grid di <=560px = 2 kolom
//    (cacat yang sama seperti PLN sebelum Siklus 29; MLBB/FF sudah diperbaiki
//    Siklus 50). Frame mobile Pulsa/E-Wallet adalah yang terakhir membawa 3 kolom.
//  - Pulsa hanya 6 dari 11 nominal Telkomsel di data.js (hilang 5.000, 15.000,
//    20.000, 30.000, 150.000); E-Wallet hanya 6 dari 9 saldo (hilang 25.000,
//    75.000, 150.000). Siklus 29/30 mencatat "6 nominal terbaca" tanpa sadar
//    itu tidak lengkap.
//  - Catatan Langkah 2 Pulsa meluber 6px dari kartu (bawah catatan 450 vs
//    kartu 444) — diperbaiki: kartu dihitung dari posisi catatan baru.
// Perbaikan: grid 2 kolom (sel 158px, pola MLBB Siklus 50), semua item dari
// data.js (harga diambil dari data.js via node -e, bukan hitung tangan),
// sel terpilih dipertahankan (Pulsa 50.000 / Saldo 50.000 — sesuai Total).
// Struktur ditemukan dinamis (cari "Pilih Nominal", kartu w=358, sel lewat
// teks nama), jadi berlaku identik untuk Light+Dark.
async function setText(node, chars) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = chars;
}
function isBlueStroke(rect) {
  const s = rect.strokes && rect.strokes[0];
  return !!(s && s.color && s.color.b > 0.8 && s.color.r < 0.3);
}
const PULSA = [
  { name: "Pulsa 5.000", price: "Rp6.500" },
  { name: "Pulsa 10.000", price: "Rp12.297" },
  { name: "Pulsa 15.000", price: "Rp16.705" },
  { name: "Pulsa 20.000", price: "Rp21.768" },
  { name: "Pulsa 25.000", price: "Rp26.830" },
  { name: "Pulsa 30.000", price: "Rp31.892" },
  { name: "Pulsa 50.000", price: "Rp51.907", sel: true },
  { name: "Pulsa 75.000", price: "Rp74.757" },
  { name: "Pulsa 100.000", price: "Rp97.968" },
  { name: "Pulsa 150.000", price: "Rp148.737" },
  { name: "Pulsa 200.000", price: "Rp197.828" },
];
const EMONEY = [
  { name: "Saldo 10.000", price: "Rp10.292" },
  { name: "Saldo 20.000", price: "Rp20.492" },
  { name: "Saldo 25.000", price: "Rp25.492" },
  { name: "Saldo 50.000", price: "Rp51.092", sel: true },
  { name: "Saldo 75.000", price: "Rp75.742" },
  { name: "Saldo 100.000", price: "Rp99.942" },
  { name: "Saldo 150.000", price: "Rp150.792" },
  { name: "Saldo 200.000", price: "Rp200.692" },
  { name: "Saldo 500.000", price: "Rp501.092" },
];
const JOBS = [
  { frame: "2:2", items: PULSA, re: /^Pulsa \d/, cellH: 54, rowStep: 62, gridY0: 294, hasMeta: false, noteGap: 14, padBottom: 16 },
  { frame: "2:59", items: PULSA, re: /^Pulsa \d/, cellH: 54, rowStep: 62, gridY0: 294, hasMeta: false, noteGap: 14, padBottom: 16 },
  { frame: "3:2", items: EMONEY, re: /^Saldo \d/, cellH: 66, rowStep: 74, gridY0: 274, hasMeta: true, noteGap: null, padBottom: 30 },
  { frame: "3:60", items: EMONEY, re: /^Saldo \d/, cellH: 66, rowStep: 74, gridY0: 274, hasMeta: true, noteGap: null, padBottom: 30 },
];
const out = [];
for (const job of JOBS) {
  const frame = figma.getNodeById(job.frame);
  const title = frame.children.find(c => c.type === "TEXT" && c.characters === "Pilih Nominal");
  if (!title) throw new Error("judul Pilih Nominal tidak ketemu di " + job.frame);
  const card2 = frame.children.find(c => c.type === "RECTANGLE" && c.width === 358 && c.y < title.y && c.y + c.height > title.y);
  if (!card2) throw new Error("kartu Langkah 2 tidak ketemu di " + job.frame);
  // sel lama: teks nama -> rect (x=nama-10, y=nama-8) + harga + meta
  const oldCells = {};
  for (const nm of frame.children.filter(c => c.type === "TEXT" && job.re.test(c.characters))) {
    const rect = frame.children.find(c => c.type === "RECTANGLE" && Math.abs(c.x - (nm.x - 10)) < 1 && Math.abs(c.y - (nm.y - 8)) < 1);
    if (!rect) throw new Error("rect sel tidak ketemu untuk " + nm.characters + " di " + job.frame);
    const price = frame.children.find(c => c.type === "TEXT" && c.characters.startsWith("Rp") && Math.abs(c.x - nm.x) < 1 && c.y > nm.y && c.y < nm.y + 30);
    if (!price) throw new Error("harga tidak ketemu untuk " + nm.characters + " di " + job.frame);
    let meta = null;
    if (job.hasMeta) {
      meta = frame.children.find(c => c.type === "TEXT" && c !== nm && c !== price && Math.abs(c.x - nm.x) < 1 && c.y > price.y && c.y < price.y + 30);
      if (!meta) throw new Error("meta tidak ketemu untuk " + nm.characters + " di " + job.frame);
    }
    oldCells[nm.characters] = { rect, nm, price, meta };
  }
  const oldGridBottom = Math.max(...Object.values(oldCells).map(c => c.rect.y + c.rect.height));
  const template = Object.values(oldCells).find(c => !isBlueStroke(c.rect));
  if (!template) throw new Error("template sel tak-terpilih tidak ketemu di " + job.frame);
  const selOld = Object.values(oldCells).find(c => isBlueStroke(c.rect));
  const moved = new Set([card2.id]);
  const grid = [];
  for (let i = 0; i < job.items.length; i++) {
    const it = job.items[i];
    const cx = 32 + (i % 2) * 168, cy = job.gridY0 + Math.floor(i / 2) * job.rowStep;
    const old = oldCells[it.name];
    let rect, nm, pr, meta = null;
    if (old) {
      rect = old.rect; nm = old.nm; pr = old.price; meta = old.meta;
      if (it.price !== pr.characters) throw new Error("harga lama beda dari data.js: " + it.name + " frame=" + pr.characters + " data=" + it.price);
      if (!!it.sel !== isBlueStroke(rect)) throw new Error("status terpilih beda untuk " + it.name + " di " + job.frame);
    } else {
      rect = template.rect.clone(); nm = template.nm.clone(); pr = template.price.clone();
      frame.appendChild(rect); frame.appendChild(nm); frame.appendChild(pr);
      rect.name = it.name; nm.name = it.name; pr.name = it.price;
      await setText(nm, it.name); await setText(pr, it.price);
      if (job.hasMeta) {
        meta = template.meta.clone(); frame.appendChild(meta);
        meta.name = "Admin sudah termasuk";
      }
    }
    rect.x = cx; rect.y = cy; rect.resize(158, job.cellH);
    nm.x = cx + 12; nm.y = cy + 8; nm.textAutoResize = "HEIGHT"; nm.resize(134, 13);
    pr.x = cx + 12; pr.y = cy + 30; pr.textAutoResize = "HEIGHT"; pr.resize(134, 15);
    if (job.hasMeta && meta) { meta.x = cx + 12; meta.y = cy + 44; meta.textAutoResize = "HEIGHT"; meta.resize(134, 11); }
    moved.add(rect.id); moved.add(nm.id); moved.add(pr.id);
    if (meta) moved.add(meta.id);
    grid.push({ item: it.name, price: pr.characters, x: rect.x, y: rect.y, sel: !!it.sel });
  }
  const rows = Math.ceil(job.items.length / 2);
  const newGridBottom = job.gridY0 + (rows - 1) * job.rowStep + job.cellH;
  const shift = newGridBottom - oldGridBottom;
  // ambang geser: simpul pertama di bawah grid lama (catatan Pulsa / kartu Langkah 3 E-Wallet)
  const threshold = Math.min(...frame.children.filter(c => c.y >= oldGridBottom - 1 && !moved.has(c.id)).map(c => c.y));
  let shifted = 0;
  for (const ch of frame.children) {
    if (ch.y >= threshold && !moved.has(ch.id)) { ch.y += shift; shifted++; }
  }
  // kartu Langkah 2: bawah baru = (catatan baru + pad) atau (grid baru + pad)
  let cardBottom;
  if (job.noteGap !== null) {
    const note = frame.children.find(c => c.type === "TEXT" && c.y >= threshold && c.y < threshold + shift + 40 && c.characters.startsWith("Nominal tampil"));
    if (!note) throw new Error("catatan Langkah 2 tidak ketemu di " + job.frame);
    cardBottom = note.y + note.height + job.padBottom;
  } else {
    cardBottom = newGridBottom + job.padBottom;
  }
  card2.resize(358, cardBottom - card2.y);
  frame.resize(390, frame.height + shift);
  out.push({ frame: job.frame, name: frame.name, items: grid.length, gridBottom: newGridBottom, shift, threshold, shifted, card2H: card2.height, card2Bottom: card2.y + card2.height, frameH: frame.height, selKept: selOld ? selOld.nm.characters : null, grid });
}
return out;
