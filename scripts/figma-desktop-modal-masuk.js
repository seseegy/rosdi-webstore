// Builder: frame Modal Masuk Desktop Light+Dark — klon Beranda Desktop (20:2 / 21:2),
// tambah veil + kartu modal (diklon dari Modal Masuk mobile 162:2 / 162:111),
// isi persis src/components/Header.jsx (Siklus 66).
// Kartu desktop 400px (max-width .modal di kode), pad 20 / judul 21 / gap 12 /
// isi / gap 16 / tombol 44 / pad 20 — konvensi frame modal mobile Siklus 65.
// Tinggi kartu dihitung dari tinggi isi terukur (lebar 360), lalu dipusatkan
// vertikal di frame 1280x2240. Baris y baru 65502 (Modal Masuk mobile berakhir 65362).
const Y = 65502;

async function loadFonts(node) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
}

const made = [];
for (const [srcId, mobId, name, fx] of [
  ["20:2", "162:2", "Modal Masuk \u2014 Desktop \u2014 Light", 0],
  ["21:2", "162:111", "Modal Masuk \u2014 Desktop \u2014 Dark", 1360],
]) {
  const src = await figma.getNodeByIdAsync(srcId);
  const mob = await figma.getNodeByIdAsync(mobId);
  if (!src || !mob) {
    return { error: "frame sumber tidak ditemukan: " + name, src: !!src, mob: !!mob };
  }
  const clone = src.clone();
  figma.currentPage.appendChild(clone);
  clone.name = name;
  clone.x = fx;
  clone.y = Y;

  const veil = mob.findAll((n) => n.name === "Veil" && n.type === "RECTANGLE")[0];
  const card = mob.findAll((n) => n.name === "Modal" && n.type === "RECTANGLE")[0];
  const btnRect = mob.findAll((n) => n.name === "Tombol Masuk")[0];
  const title = mob.findAll((n) => n.type === "TEXT" && n.name === "Masuk ke Rosdi Store")[0];
  const body = mob.findAll((n) => n.type === "TEXT" && n.name.indexOf("Sedang disiapkan") === 0)[0];
  const btnText = mob.findAll((n) => n.type === "TEXT" && n.name === "Siap, lanjut belanja")[0];
  if (!veil || !card || !btnRect || !title || !body || !btnText) {
    return { error: "simpul modal tidak lengkap di " + name, found: { veil: !!veil, card: !!card, btnRect: !!btnRect, title: !!title, body: !!body, btnText: !!btnText } };
  }

  const veilC = veil.clone();
  const cardC = card.clone();
  const btnRectC = btnRect.clone();
  const titleC = title.clone();
  const bodyC = body.clone();
  const btnTextC = btnText.clone();
  clone.appendChild(veilC);
  clone.appendChild(cardC);
  clone.appendChild(btnRectC);
  clone.appendChild(titleC);
  clone.appendChild(bodyC);
  clone.appendChild(btnTextC);

  veilC.resize(1280, 2240);
  veilC.x = 0;
  veilC.y = 0;

  await loadFonts(titleC);
  titleC.textAutoResize = "HEIGHT";
  titleC.resize(360, titleC.height);

  await loadFonts(bodyC);
  bodyC.textAutoResize = "HEIGHT";
  bodyC.resize(360, bodyC.height);
  const bodyH = Math.round(bodyC.height);

  await loadFonts(btnTextC);
  btnTextC.resize(360, btnTextC.height);
  const btnTextAlign = btnTextC.textAlignHorizontal;

  // Geometri kartu: pad 20, judul 21, gap 12, isi, gap 16, tombol 44, pad 20.
  const cardH = 20 + 21 + 12 + bodyH + 16 + 44 + 20;
  const cardX = 440;
  const cardY = Math.round((2240 - cardH) / 2);
  cardC.resize(400, cardH);
  cardC.x = cardX;
  cardC.y = cardY;
  titleC.x = cardX + 20;
  titleC.y = cardY + 20;
  bodyC.x = cardX + 20;
  bodyC.y = cardY + 53;
  btnRectC.resize(360, 44);
  btnRectC.x = cardX + 20;
  btnRectC.y = cardY + 53 + bodyH + 16;
  btnTextC.x = cardX + 20;
  btnTextC.y = btnRectC.y + 13;

  made.push({ frame: clone.id, name, bodyH, cardH, cardY, btnY: btnRectC.y, btnTextAlign, kids: clone.children.length });
}
return { created: made };
