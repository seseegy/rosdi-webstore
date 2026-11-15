// Rebuild Siklus 68: seksi "Pulsa, Data & PLN" + trust Beranda mobile agar cocok
// src/pages/Home.jsx saat ini (10 kartu grid 2 kolom + 4 kartu trust 1 kolom),
// lalu rambatkan ke klon-klonnya (modal S&K/Refund/Masuk, pencarian mlbb/zzz).
// Dijalankan lewat use_figma; placeholder __FRAME__/__TOKENS__/__MODE__ diisi driver.
// MODE "full": rebuild seksi + trust (Beranda + latar modal).
// MODE "trust": rebuild trust saja (frame pencarian — seksinya sudah dihapus Siklus 8).
// Geometri mengikuti index.css: .wrap padding 16; .sec-head h2 + margin-bottom 14;
// .grid.c3 -> 2 kolom di <=620px (kartu 173, gap 12); .card padding 14 radius 14;
// .tile 46; .p-name 14.5/600 margin 10 0 2; .p-sub 12.5; .p-from 13/600 margin-top 6;
// section.block margin 26; .trust 1 kolom di <=480px (kartu 358, gap 12);
// .trust .ic 38 radius 10; b 13.5; span 12.
const T = __TOKENS__;
const FRAME_ID = "__FRAME__";
const MODE = "__MODE__";

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

function rect(parent, name, x, y, w, h, fill, radius, stroke, strokeW) {
  const n = figma.createRectangle();
  n.name = name; n.x = x; n.y = y; n.resize(w, h);
  n.fills = fill ? solid(fill) : [];
  if (radius) n.cornerRadius = radius;
  if (stroke) { n.strokes = solid(stroke); n.strokeWeight = strokeW || 1; }
  parent.appendChild(n); return n;
}
async function txt(parent, name, x, y, str, size, weight, color, opts) {
  opts = opts || {};
  const n = figma.createText();
  n.name = name; n.x = x; n.y = y;
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.fills = solid(color); n.characters = str;
  if (opts.lineHeight) n.lineHeight = { unit: "PIXELS", value: opts.lineHeight };
  if (opts.align) n.textAlignHorizontal = opts.align;
  if (opts.width) { n.textAutoResize = "HEIGHT"; n.resize(opts.width, n.height); }
  parent.appendChild(n); return n;
}
async function centerTxt(parent, name, cx, cy, str, size, weight, color) {
  const n = await txt(parent, name, 0, 0, str, size, weight, color);
  n.x = cx - n.width / 2; n.y = cy - n.height / 2;
  return n;
}
async function measureH(str, size, weight, width) {
  const n = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.characters = str;
  n.textAutoResize = "HEIGHT"; n.resize(width, n.height);
  const h = n.height; n.remove(); return h;
}

// Isi persis Home.jsx + data.js (VOUCHERS, EWALLETS, CATEGORY_COLORS).
const CARDS = [
  { name: "Pulsa Reguler", ini: "PL", color: "#2563eb", sub: "Telkomsel, Indosat, XL, Axis, Tri, Smartfren", from: "Operator terdeteksi dari nomor" },
  { name: "Paket Data", ini: "DT", color: "#0284c7", sub: "Kuota utama & paket khusus game", from: "Masa aktif tertulis di tiap paket" },
  { name: "Token PLN", ini: "LN", color: "#0f766e", sub: "20 ribu sampai 1 juta", from: "Nama pelanggan dicek sebelum bayar" },
  { name: "Voucher Google Play", ini: "GP", color: "#0f766e", sub: "Kode voucher dikirim ke email", from: "Dari Rp5.500" },
  { name: "Steam Wallet IDR", ini: "ST", color: "#334155", sub: "Kode voucher dikirim ke email", from: "Dari Rp12.600" },
  { name: "PlayStation Network ID", ini: "PS", color: "#1e3a8a", sub: "Kode voucher dikirim ke email", from: "Dari Rp108.000" },
  { name: "Saldo DANA", ini: "DN", color: "#2563eb", sub: "Isi saldo ke nomor HP terdaftar", from: "Admin sudah termasuk di harga" },
  { name: "Saldo GoPay", ini: "GP", color: "#0f766e", sub: "Isi saldo ke nomor HP terdaftar", from: "Admin sudah termasuk di harga" },
  { name: "Saldo OVO", ini: "OV", color: "#4c1d95", sub: "Isi saldo ke nomor HP terdaftar", from: "Admin sudah termasuk di harga" },
  { name: "Saldo ShopeePay", ini: "SP", color: "#c2410c", sub: "Isi saldo ke nomor HP terdaftar", from: "Admin sudah termasuk di harga" },
];
const TRUST = [
  { ic: "⚡", t: "Proses instan", d: "Pesanan diproses otomatis dalam hitungan detik, 24 jam." },
  { ic: "Rp", t: "Harga transparan", d: "Harga tiap metode pembayaran terlihat sebelum kamu memilih." },
  { ic: "✓", t: "Garansi uang kembali", d: "Pesanan gagal? Saldo kembali penuh tanpa ribet." },
  { ic: "☎", t: "CS 24/7", d: "Tim bantuan siap lewat WhatsApp dan email kapan pun." },
];
const TRUST_OLD = /^(Proses instan|Hitungan detik|Pembayaran aman|QRIS, e-wallet, VA|Garansi|Uang kembali|CS 24\/7|Siap membantu)$/;

const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const oldH = f.height;
const kids = [...f.children];
const veil = kids.find((c) => /veil/i.test(c.name));
// Tangkap simpul kartu modal SEBELUM membuat simpul baru: simpul baru ikut
// ter-append setelah veil, jadi shift kartu modal harus memakai daftar ini —
// bukan slice ulang sesudah build (bug Siklus 68: simpul baru ikut tergeser).
const afterVeilNodes = veil ? [...kids.slice(kids.indexOf(veil) + 1)] : [];
const bgKids = veil ? kids.slice(0, kids.indexOf(veil)) : kids;
// margin bawah lama (jarak simpul latar terbawah ke tepi frame) dipertahankan.
const oldBottom = Math.max(...bgKids.map((c) => c.y + c.height));
const bottomMargin = oldH - oldBottom;

const texts = f.findAllWithCriteria({ types: ["TEXT"] });
const trustHead = texts.find((t) => t.characters === "Kenapa Rosdi Store");
if (!trustHead) return { error: "judul trust tidak ditemukan", frame: FRAME_ID };
const trustOld = texts.filter((t) => TRUST_OLD.test(t.characters || ""));
if (trustOld.length !== 8) return { error: "teks trust lama bukan 8", count: trustOld.length, frame: FRAME_ID };

const created = [];
let sectionBottom = null;
let cardH = null;
let rowH = null;

if (MODE === "full") {
  const secHead = texts.find((t) => t.characters === "Pulsa, Data & PLN");
  if (!secHead) return { error: "judul seksi lama tidak ditemukan", frame: FRAME_ID };
  const secY = secHead.y;
  const trustY = trustHead.y;
  // Simpul latar di antara judul seksi dan judul trust = 4 baris lama (5 simpul/baris).
  const oldRows = bgKids.filter((c) => c.y >= secY + 30 && c.y < trustY);
  if (oldRows.length !== 20) return { error: "simpul baris lama bukan 20", count: oldRows.length, frame: FRAME_ID };
  // Ukur tinggi kartu (teks diukur dulu, bukan asumsi) — lebar teks 173-28=145.
  cardH = [];
  for (const c of CARDS) {
    const nameH = await measureH(c.name, 14.5, "SemiBold", 145);
    const subH = await measureH(c.sub, 12.5, "Regular", 145);
    const fromH = await measureH(c.from, 13, "SemiBold", 145);
    cardH.push(14 + 46 + 10 + nameH + 2 + subH + 6 + fromH + 14);
  }
  rowH = [];
  for (let r = 0; r < 5; r++) rowH.push(Math.max(cardH[r * 2], cardH[r * 2 + 1]));
  const gridTop = secY + 21 + 14;
  // Hapus baris lama dulu, baru bangun (urutan aman: hapus -> buat).
  for (const n of oldRows) n.remove();
  // Judul seksi: ganti teks (font dipertahankan), lebar menyesuaikan otomatis.
  {
    const segs = secHead.getStyledTextSegments(["fontName", "fontSize"]);
    await figma.loadFontAsync(segs[0].fontName);
    secHead.textAutoResize = "WIDTH_AND_HEIGHT";
    secHead.characters = "Pulsa, Data, PLN & E-Wallet";
    secHead.name = "Pulsa, Data, PLN & E-Wallet";
  }
  // Bangun kartu dengan y kumulatif per baris (jelas, tanpa rumus silang).
  let gy = gridTop;
  for (let r = 0; r < 5; r++) {
    for (let col = 0; col < 2; col++) {
      const i = r * 2 + col;
      const c = CARDS[i];
      const x = 16 + col * (173 + 12);
      const y = gy;
      const card = rect(f, c.name, x, y, 173, rowH[r], T.surface, 14, T.line, 1);
      created.push(card);
      const tile = rect(f, "Tile " + c.ini, x + 14, y + 14, 46, 46, c.color, 12);
      created.push(tile);
      created.push(await centerTxt(f, c.ini, x + 14 + 23, y + 14 + 23, c.ini, 15, "ExtraBold", "#FFFFFF"));
      const nameH = await measureH(c.name, 14.5, "SemiBold", 145);
      const subH = await measureH(c.sub, 12.5, "Regular", 145);
      created.push(await txt(f, c.name, x + 14, y + 14 + 46 + 10, c.name, 14.5, "SemiBold", T.ink, { width: 145 }));
      created.push(await txt(f, c.sub, x + 14, y + 14 + 46 + 10 + nameH + 2, c.sub, 12.5, "Regular", T.sub, { width: 145 }));
      created.push(await txt(f, c.from, x + 14, y + 14 + 46 + 10 + nameH + 2 + subH + 6, c.from, 13, "SemiBold", T.blue, { width: 145 }));
    }
    gy += rowH[r] + 12;
  }
  sectionBottom = gy - 12;
}

// Trust: judul digeser ke bawah grid (full) atau tetap (trust-only); kartu baru.
const trustHeadY = MODE === "full" ? sectionBottom + 26 : trustHead.y;
trustHead.y = trustHeadY;
for (const n of trustOld) n.remove();
let ty = trustHeadY + 21 + 14;
const trustCardH = [];
for (const t of TRUST) {
  const titleH = await measureH(t.t, 13.5, "Bold", 280);
  const descH = await measureH(t.d, 12, "Regular", 280);
  trustCardH.push(14 + Math.max(38, titleH + 2 + descH) + 14);
}
for (let i = 0; i < TRUST.length; i++) {
  const t = TRUST[i];
  const y = ty;
  const card = rect(f, "Trust " + t.t, 16, y, 358, trustCardH[i], T.surface, 14, T.line, 1);
  created.push(card);
  const ic = rect(f, "Ikon " + t.t, 16 + 14, y + 14, 38, 38, T.soft, 10);
  created.push(ic);
  created.push(await centerTxt(f, t.ic, 16 + 14 + 19, y + 14 + 19, t.ic, 17, "Bold", T.blue));
  const titleH = await measureH(t.t, 13.5, "Bold", 280);
  created.push(await txt(f, t.t, 16 + 14 + 38 + 12, y + 14, t.t, 13.5, "Bold", T.ink, { width: 280 }));
  created.push(await txt(f, t.d, 16 + 14 + 38 + 12, y + 14 + titleH + 2, t.d, 12, "Regular", T.sub, { width: 280 }));
  ty += trustCardH[i] + 12;
}
const trustBottom = ty - 12;

// Frame memanjang; veil + kartu modal ikut menyesuaikan (latar modal).
const newH = trustBottom + bottomMargin;
const dH = newH - oldH;
f.resize(390, newH);
if (veil) {
  veil.resize(390, newH);
  // Hanya simpul kartu modal (ditangkap sebelum build) yang digeser —
// simpul baru yang dibuat di atas tidak ikut.
  for (const n of afterVeilNodes) n.y += dH / 2;
}
// Simpul baru harus di bawah veil (bukan menutupinya): pindah sebelum veil.
if (veil) {
  let idx = f.children.indexOf(veil);
  for (const n of created) { f.insertChild(idx, n); idx++; }
}
return {
  frame: f.name, mode: MODE, oldH: Math.round(oldH), newH: Math.round(newH),
  sectionBottom: sectionBottom === null ? null : Math.round(sectionBottom),
  trustHeadY: Math.round(trustHeadY), trustBottom: Math.round(trustBottom),
  cardH: cardH || null, rowH: rowH || null, trustCardH,
  created: created.length, bottomMargin: Math.round(bottomMargin),
};
