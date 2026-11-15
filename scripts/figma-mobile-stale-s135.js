// Siklus 135: sinkron teks kedaluwarsa sisi MOBILE.
// - Judul seksi util "Pulsa, Data, PLN & E-Wallet" -> "Pulsa, Data, PLN,
//   E-Wallet & Tagihan" (Home.jsx:120) di 8 frame: Beranda 1:2/1:105 +
//   latar modal S&K 10:2/10:105, Refund 13:2/13:111, Masuk 162:2/162:111.
// - Body S&K mobile 10:2/10:105 -> DOCS.sk Footer.jsx (tambah
//   ", dan nomor tagihan"); kartu Modal dihitung ulang dari bodyH dan
//   dipusatkan ulang (pola Siklus 134 desktop; kartu mobile 358 lebar,
//   x=16, rumus cardH = 20+21+12+bodyH+16+44+20).
const HEAD_NEW = "Pulsa, Data, PLN, E-Wallet & Tagihan";
const SK_BODY_NEW = "Semua pesanan diproses otomatis setelah pembayaran terkonfirmasi. Pembeli wajib memeriksa User ID, nomor HP, ID pelanggan, dan nomor tagihan sebelum membayar \u2014 kesalahan penulisan tujuan di luar tanggung jawab Rosdi Store dan pesanan yang sudah terproses tidak dapat dibatalkan. Harga mengikuti katalog pemasok dan dapat berubah sewaktu-waktu; harga yang berlaku adalah harga saat pesanan dibuat.";

async function loadFonts(node) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
}
async function setText(node, chars) {
  await loadFonts(node);
  node.characters = chars;
}
async function setTextOneLine(node, chars, maxW) {
  await loadFonts(node);
  node.textAutoResize = "WIDTH_AND_HEIGHT";
  node.characters = chars;
  const w = Math.min(Math.ceil(node.width), maxW);
  node.textAutoResize = "HEIGHT";
  node.resize(w, node.height);
  return w;
}

async function fixTitle(frame) {
  const texts = frame.findAll((n) => n.type === "TEXT");
  const head = texts.find((n) => n.characters.indexOf("Pulsa, Data") === 0);
  if (!head) return { error: "judul util hilang" };
  const before = head.characters;
  let wAfter = Math.round(head.width);
  if (before !== HEAD_NEW) {
    wAfter = await setTextOneLine(head, HEAD_NEW, 358);
    head.name = HEAD_NEW;
  }
  return { before, wBefore: 223, wAfter, hAfter: Math.round(head.height), y: Math.round(head.y) };
}

async function fixSkModal(frameId) {
  const frame = await figma.getNodeByIdAsync(frameId);
  if (!frame) return { frameId, error: "frame tidak ditemukan" };
  const res = { frameId, title: await fixTitle(frame) };
  const kids = frame.children || [];
  const veilIdx = kids.findIndex((k) => k.name === "Veil");
  const modalNodes = veilIdx >= 0 ? kids.slice(veilIdx + 1) : [];
  const card = modalNodes.find((n) => n.name === "Modal" && n.type === "RECTANGLE");
  const title = modalNodes.find((n) => n.type === "TEXT" && n.name === "Syarat & Ketentuan");
  const body = modalNodes.find((n) => n.type === "TEXT" && (n.name || "").indexOf("Semua pesanan") === 0);
  const btnRect = modalNodes.find((n) => n.name === "Tombol Tutup" && n.type === "RECTANGLE");
  const btnText = modalNodes.find((n) => n.type === "TEXT" && n.name === "Tutup");
  if (!card || !title || !body || !btnRect || !btnText) {
    return { frameId, error: "simpul modal tidak lengkap",
      found: { card: !!card, title: !!title, body: !!body, btnRect: !!btnRect, btnText: !!btnText }, res };
  }
  const bodyHBefore = Math.round(body.height);
  const cardHBefore = Math.round(card.height);
  const cardYBefore = Math.round(card.y);
  let cardH = cardHBefore;
  let bodyH = bodyHBefore;
  if (body.characters !== SK_BODY_NEW) {
    await setText(body, SK_BODY_NEW);
    body.name = SK_BODY_NEW;
    bodyH = Math.round(body.height);
    cardH = 20 + 21 + 12 + bodyH + 16 + 44 + 20;
  }
  const cardY = Math.round((Math.round(frame.height) - cardH) / 2);
  const titleDy = Math.round(title.y - card.y);
  const bodyDy = Math.round(body.y - card.y);
  const btnDy = bodyDy + bodyH + 16;
  const btnTextDy = Math.round(btnText.y - btnRect.y);
  card.resize(358, cardH);
  card.x = 16; card.y = cardY;
  title.x = 32; title.y = cardY + titleDy;
  body.x = 32; body.y = cardY + bodyDy;
  btnRect.x = 32; btnRect.y = cardY + btnDy;
  btnText.x = 32; btnText.y = btnRect.y + btnTextDy;
  res.skBody = { bodyHBefore, bodyHAfter: bodyH, cardHBefore, cardHAfter: cardH, cardYBefore, cardYAfter: cardY, btnY: Math.round(btnRect.y) };
  return res;
}

const out = [];
for (const fid of ["1:2", "1:105", "13:2", "13:111", "162:2", "162:111"]) {
  const frame = await figma.getNodeByIdAsync(fid);
  if (!frame) { out.push({ frameId: fid, error: "frame tidak ditemukan" }); continue; }
  out.push({ frameId: fid, name: frame.name, title: await fixTitle(frame) });
}
out.push(await fixSkModal("10:2"));
out.push(await fixSkModal("10:105"));
return out;
