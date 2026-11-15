// Builder frame Figma "Sukses — Pascabayar" mobile (390px), diklon dari
// frame Sukses mobile (4:2 Light / 4:29 Dark) lalu diubah isinya.
// Menutup antrean Tahap 5: halaman sukses tagihan pascabayar — sebelumnya
// hanya ada di kode (SuccessPage kind="tagihan"), belum ada frame Figma.
// Isi mengikuti src/pages/InfoPages.jsx (SuccessPage: sub khusus tagihan,
// tanpa blok token, tanpa baris "Bukti dikirim ke" bila order tanpa
// email/WA) + src/data.js (BILLS[0] PLN Pascabayar: tagihan Rp187.400 +
// admin Rp2.500 = Rp189.900; billItem name "Tagihan Oktober 2026").
// Contoh order: PLN Pascabayar — Tagihan Oktober 2026, tujuan
// 543210987654, QRIS tanpa biaya, total Rp189.900, ref RSD-TGH8K2.
// Geometri: status baru 2 baris (h=30, sama seperti sumber) dan nilai
// Produk baru 2 baris (sama seperti sumber) — tidak ada geser; catatan
// lama "Untuk PLN, nomor token..." dihapus (tidak berlaku untuk tagihan)
// dan tinggi frame dipangkas 760 -> 662 (cardBottom 644 + 18).
// Dijalankan lewat use_figma; placeholder __NAME__/__SRC__/__X__/__Y__/
// __TOKENS__ diisi driver sebelum dikirim.
const FRAME_NAME = "__NAME__";
const SRC_ID = "__SRC__";
const FX = __X__;
const FY = __Y__;

async function setText(node, str, width) {
  const segs = node.getStyledTextSegments(["fontName", "fontSize"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = str;
  if (width) { node.textAutoResize = "HEIGHT"; node.resize(width, node.height); }
  node.name = str;
}

const src = figma.getNodeById(SRC_ID);
if (!src) throw new Error("frame sumber tidak ditemukan: " + SRC_ID);
const frame = src.clone();
frame.name = FRAME_NAME;
figma.currentPage.appendChild(frame);
frame.x = FX; frame.y = FY;

// ---- validasi struktur sumber (geometri dari probe Siklus 132) ----
const card = frame.children.find((n) => n.type === "RECTANGLE" && n.x === 16 && n.y === 84 && n.width === 358 && n.height === 560);
const status = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Status: Diproses") === 0);
const refVal = frame.children.find((n) => n.type === "TEXT" && n.characters === "RSD-X8K2P4");
const prodVal = frame.children.find((n) => n.type === "TEXT" && n.characters === "Mobile Legends — 172 Diamonds");
const tujuanVal = frame.children.find((n) => n.type === "TEXT" && n.characters === "12345678 (1234)");
const hargaVal = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp43.500 + Rp0");
const totalVal = frame.children.find((n) => n.type === "TEXT" && n.characters === "Rp43.500");
const oldNote = frame.children.find((n) => n.type === "TEXT" && n.characters.indexOf("Untuk PLN, nomor token") === 0);
if (!card || !status || !refVal || !prodVal || !tujuanVal || !hargaVal || !totalVal || !oldNote) {
  throw new Error("struktur frame sumber tidak seperti diduga: card=" + !!card + " status=" + !!status + " ref=" + !!refVal + " prod=" + !!prodVal + " tujuan=" + !!tujuanVal + " harga=" + !!hargaVal + " total=" + !!totalVal + " note=" + !!oldNote);
}

// ---- hapus catatan token lama, ubah teks rincian ke order tagihan ----
oldNote.remove();
await setText(status, "Tagihan sudah dibayar. Simpan nomor transaksi sebagai bukti pembayaran.", 296);
await setText(refVal, "RSD-TGH8K2", 174);
await setText(prodVal, "PLN Pascabayar — Tagihan Oktober 2026", 174);
await setText(tujuanVal, "543210987654", 174);
await setText(hargaVal, "Rp189.900 + Rp0", 174);
await setText(totalVal, "Rp189.900", 100);

// ---- pangkas tinggi frame (kartu berakhir 644; catatan lama sudah dihapus) ----
frame.resize(390, 662);

return { frameId: frame.id, name: frame.name, x: frame.x, y: frame.y, w: frame.width, h: frame.height, children: frame.children.length, statusH: status.height, prodH: prodVal.height, cardBottom: 84 + card.height };
