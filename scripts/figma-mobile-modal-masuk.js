// Builder: frame Modal Masuk (login) Light+Dark — klon frame Modal S&K (10:2 / 10:105),
// isi diganti ke modal login persis src/components/Header.jsx (Siklus 65).
// Kartu dihitung dari tinggi isi terukur lalu dipusatkan vertikal di frame 390x1240
// (pola S&K: kartu 322px di y=459 = (1240-322)/2).
const TITLE = "Masuk ke Rosdi Store";
const BODY = "Sedang disiapkan. Untuk sekarang semua pembelian bisa dilakukan sebagai tamu, tanpa perlu akun \u2014 bukti pembayaran dikirim ke email atau WhatsApp yang kamu isi saat checkout.";
const BTN = "Siap, lanjut belanja";
const Y = 64122;

async function loadFonts(node) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
}

const made = [];
for (const [srcId, name, fx] of [["10:2", "Modal Masuk \u2014 Light", 0], ["10:105", "Modal Masuk \u2014 Dark", 470]]) {
  const src = await figma.getNodeByIdAsync(srcId);
  const clone = src.clone();
  figma.currentPage.appendChild(clone);
  clone.name = name;
  clone.x = fx;
  clone.y = Y;

  const card = clone.findAll((n) => n.name === "Modal" && n.type === "RECTANGLE")[0];
  const btnRect = clone.findAll((n) => n.name === "Tombol Tutup")[0];
  const title = clone.findAll((n) => n.type === "TEXT" && n.name === "Syarat & Ketentuan")[0];
  const body = clone.findAll((n) => n.type === "TEXT" && n.name.indexOf("Semua pesanan") === 0)[0];
  const btnText = clone.findAll((n) => n.type === "TEXT" && n.name === "Tutup")[0];
  if (!card || !btnRect || !title || !body || !btnText) {
    return { error: "simpul modal tidak lengkap di " + name, found: { card: !!card, btnRect: !!btnRect, title: !!title, body: !!body, btnText: !!btnText } };
  }

  await loadFonts(title);
  title.characters = TITLE;
  title.name = TITLE;
  title.textAutoResize = "HEIGHT";
  title.resize(326, title.height);

  await loadFonts(body);
  body.characters = BODY;
  body.name = BODY;
  body.textAutoResize = "HEIGHT";
  body.resize(326, body.height);
  const bodyH = Math.round(body.height);

  await loadFonts(btnText);
  btnText.characters = BTN;
  btnText.name = BTN;

  btnRect.name = "Tombol Masuk";

  // Geometri kartu mengikuti konvensi frame S&K: pad atas 20, judul 21, gap 12,
  // isi, gap 16, tombol 44, pad bawah 20; kartu dipusatkan vertikal di frame 1240.
  const cardH = 20 + 21 + 12 + bodyH + 16 + 44 + 20;
  const cardY = Math.round((1240 - cardH) / 2);
  card.resize(358, cardH);
  card.y = cardY;
  title.y = cardY + 20;
  body.y = cardY + 53;
  btnRect.y = cardY + 53 + bodyH + 16;
  btnText.y = btnRect.y + 13;

  made.push({ frame: clone.id, name, cardH, bodyH, cardY, btnY: btnRect.y });
}
return { created: made };
