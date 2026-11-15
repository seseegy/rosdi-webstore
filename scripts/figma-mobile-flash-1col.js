// Rebuild Siklus 73: kartu Flash Sale mobile 2 kolom (174x118, tanpa progress)
// -> 1 kolom (358px) sesuai kode pasca-Siklus 72:
// Home.jsx + index.css: .grid.c2 -> 1 kolom di <=560px; kartu berisi baris
// tile 46 + nama/sub + badge rata kanan, harga + coret, progress bar,
// "Terjual N% dari kuota promo hari ini". Dijalankan lewat use_figma;
// placeholder __FRAME__/__TOKENS__/__EXPECTED__ diisi driver.
// EXPECTED "both": 2 kartu (Weekly Diamond Pass + 70 Diamonds).
// EXPECTED "weekly": hanya Weekly Diamond Pass (frame pencarian mlbb).
// Struktur ditemukan dinamis (cari teks nama + rect kartu 174x118 yang
// memuatnya), tanpa hardcode id simpul — berlaku Light+Dark.
const T = __TOKENS__;
const FRAME_ID = "__FRAME__";
const EXPECTED = "__EXPECTED__";

const C = (h) => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; };
const solid = (h) => [{ type: "SOLID", color: C(h) }];

const CARDS = [
  { name: "Weekly Diamond Pass", sub: "Mobile Legends", ini: "ML", sold: 68 },
  { name: "70 Diamonds", sub: "Free Fire", ini: "FF", sold: 81 },
];
const WANT = EXPECTED === "weekly" ? [CARDS[0]] : CARDS;

async function centerTxt(parent, name, cx, cy, str, size, weight, color) {
  const n = figma.createText();
  n.name = name;
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.fills = solid(color); n.characters = str;
  // JANGAN resize(60, ...) seperti helper Siklus 68: width jadi 60 (bukan
  // lebar glif), sehingga x = cx-30 menggeser teks 20px ke kiri dan glif
  // terpotong tepi tile. Pakai ukuran konten apa adanya (WIDTH_AND_HEIGHT).
  n.x = Math.round(cx - n.width / 2); n.y = Math.round(cy - n.height / 2);
  parent.appendChild(n); return n;
}

const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const oldH = f.height;
const kids = [...f.children];
const veil = kids.find((c) => /veil/i.test(c.name));
// Tangkap simpul kartu modal SEBELUM membuat simpul baru (bug Siklus 68:
// simpul baru ter-append setelah veil lalu ikut tergeser bila daftar
// diambil sesudah build).
const afterVeilNodes = veil ? [...kids.slice(kids.indexOf(veil) + 1)] : [];
const bgKids = veil ? kids.slice(0, kids.indexOf(veil)) : kids;
const texts = f.findAllWithCriteria({ types: ["TEXT"] });

// Temukan tiap kartu lewat teks namanya + rect 174x118 yang memuatnya.
const found = [];
for (const want of WANT) {
  const nameTxt = texts.find((t) => t.characters === want.name);
  if (!nameTxt) return { error: "teks nama tidak ditemukan", name: want.name, frame: FRAME_ID };
  const card = bgKids.find((c) => c.type === "RECTANGLE" && Math.round(c.width) === 174 && Math.round(c.height) === 118
    && nameTxt.x >= c.x - 1 && nameTxt.y >= c.y - 1
    && nameTxt.x + nameTxt.width <= c.x + 175 && nameTxt.y + nameTxt.height <= c.y + 119);
  if (!card) return { error: "rect kartu 174x118 tidak ditemukan", name: want.name, frame: FRAME_ID };
  const members = bgKids.filter((c) => c !== card
    && c.x >= card.x - 1 && c.y >= card.y - 1
    && c.x + c.width <= card.x + 175 && c.y + c.height <= card.y + 119);
  const tile = members.find((c) => c.type === "RECTANGLE" && Math.round(c.width) === 44 && Math.round(c.height) === 44);
  const badgeRect = members.find((c) => c.type === "RECTANGLE" && Math.round(c.width) === 36 && Math.round(c.height) === 18);
  const badgeTxt = members.find((c) => c.type === "TEXT" && c.characters === "-10%");
  const subTxt = members.find((c) => c.type === "TEXT" && c.characters === want.sub);
  const rpTexts = members.filter((c) => c.type === "TEXT" && /^Rp/.test(c.characters || ""));
  rpTexts.sort((a, b) => b.fontSize - a.fontSize);
  const priceTxt = rpTexts[0];
  const wasTxt = rpTexts[1];
  const iniTxt = members.find((c) => c.type === "TEXT" && c.characters === want.ini);
  if (!tile || !badgeRect || !badgeTxt || !subTxt || !priceTxt || !wasTxt) {
    return { error: "anggota kartu tidak lengkap", name: want.name, frame: FRAME_ID,
      got: { tile: !!tile, badgeRect: !!badgeRect, badgeTxt: !!badgeTxt, subTxt: !!subTxt, priceTxt: !!priceTxt, wasTxt: !!wasTxt, iniTxt: !!iniTxt } };
  }
  found.push({ want, card, tile, badgeRect, badgeTxt, subTxt, priceTxt, wasTxt, iniTxt, nameTxt });
}
if (found.length !== WANT.length) return { error: "jumlah kartu tidak cocok", found: found.length, want: WANT.length, frame: FRAME_ID };

const gridTop = Math.round(found[0].card.y);
const oldBottom = Math.round(Math.max(...found.map((o) => o.card.y + o.card.height)));
// Tinggi kartu dihitung dari tinggi teks terukur (bukan asumsi), mengikuti
// margin/padding kode: pad 14 + baris1 46 + gap 10 + harga + gap 10 +
// progress 6 + gap 6 + terjual + pad 14.
const nameH = Math.round(found[0].nameTxt.height);
const subH = Math.round(found[0].subTxt.height);
const priceH = Math.round(found[0].priceTxt.height);
const row1H = Math.max(46, nameH + 3 + subH);
const soldProbe = figma.createText();
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
soldProbe.fontName = { family: "Inter", style: "Regular" };
// Skala font frame (probe s73b): nama 12.5 / sub 11 / harga 14 / coret 10.5 —
// ~0.86x ukuran kode (14.5/12.5/16/12). Simpul lama dipertahankan apa adanya;
// teks baru mengikuti skala frame (Terjual = sub 11px), bukan ukuran kode.
soldProbe.fontSize = 11; soldProbe.characters = "Terjual 68% dari kuota promo hari ini";
soldProbe.textAutoResize = "HEIGHT"; soldProbe.resize(330, soldProbe.height);
const soldH = Math.round(soldProbe.height);
soldProbe.remove();
const cardH = 14 + row1H + 10 + priceH + 10 + 6 + 6 + soldH + 14;
const gap = 12;
const newBottom = gridTop + found.length * cardH + (found.length - 1) * gap;
const delta = newBottom - oldBottom;

const rebuilt = [];
for (let i = 0; i < found.length; i++) {
  const o = found[i];
  const Y = gridTop + i * (cardH + gap);
  const cardIdx = f.children.indexOf(o.card);
  // Kartu: 358 lebar, tinggi terukur.
  o.card.resize(358, cardH);
  o.card.x = 16; o.card.y = Y;
  // Tile 46x46 (inisial ditambah di akhir, di ATAS tile — insertChild di
  // index kartu menaruhnya di bawah tile sehingga tertutup).
  o.tile.resize(46, 46);
  o.tile.cornerRadius = 12;
  o.tile.x = 30; o.tile.y = Y + 14;
  // Nama + sub di samping tile, rata tengah vertikal terhadap tile.
  const stackH = nameH + 3 + subH;
  const nameY = Y + 14 + Math.round((row1H - stackH) / 2);
  o.nameTxt.textAutoResize = "HEIGHT";
  o.nameTxt.resize(220, o.nameTxt.height);
  o.nameTxt.x = 88; o.nameTxt.y = nameY;
  o.subTxt.x = 88; o.subTxt.y = nameY + nameH + 3;
  // Badge rata kanan kartu, tengah vertikal baris 1.
  o.badgeRect.cornerRadius = 6;
  o.badgeRect.x = 324; o.badgeRect.y = Y + 14 + Math.round((row1H - 18) / 2);
  o.badgeTxt.x = Math.round(324 + 18 - o.badgeTxt.width / 2);
  o.badgeTxt.y = Math.round(Y + 14 + Math.round((row1H - 18) / 2) + 9 - o.badgeTxt.height / 2);
  // Harga + coret.
  const priceY = Y + 14 + row1H + 10;
  o.priceTxt.x = 30; o.priceTxt.y = priceY;
  o.wasTxt.x = Math.round(30 + o.priceTxt.width + 8);
  o.wasTxt.y = priceY + 2;
  // Progress: track + isi (baru).
  const progY = priceY + priceH + 10;
  const track = figma.createRectangle();
  track.name = "Progress " + o.want.name;
  track.x = 30; track.y = progY; track.resize(330, 6);
  track.cornerRadius = 3; track.fills = solid(T.surface2);
  f.insertChild(cardIdx + 1, track);
  const fill = figma.createRectangle();
  fill.name = "Progress isi " + o.want.name;
  fill.x = 30; fill.y = progY; fill.resize(Math.round(330 * o.want.sold / 100), 6);
  fill.cornerRadius = 3; fill.fills = o.priceTxt.fills;
  f.insertChild(cardIdx + 2, fill);
  // Teks Terjual (baru): salin font/fill dari sub kartu.
  const sold = figma.createText();
  sold.name = "Terjual " + o.want.name;
  const segs = o.subTxt.getStyledTextSegments(["fontName"]);
  await figma.loadFontAsync(segs[0].fontName);
  sold.fontName = segs[0].fontName;
  sold.fontSize = 11; sold.fills = o.subTxt.fills;
  sold.characters = "Terjual " + o.want.sold + "% dari kuota promo hari ini";
  sold.textAutoResize = "HEIGHT"; sold.resize(330, sold.height);
  sold.x = 30; sold.y = progY + 6 + 6;
  f.insertChild(cardIdx + 3, sold);
  // Inisial di tile (baru: kode menampilkan inisial di tile, frame lama
  // tidak punya teks inisial di kartu flash) — sisipkan tepat di atas tile.
  if (!o.iniTxt) {
    const ini = await centerTxt(f, o.want.ini, 30 + 23, Y + 14 + 23, o.want.ini, 15, "ExtraBold", "#FFFFFF");
    f.insertChild(f.children.indexOf(o.tile) + 1, ini);
    rebuilt.push({ card: o.want.name, added: "iniTxt" });
  }
  rebuilt.push({ card: o.want.name, y: Y, cardH, progW: Math.round(330 * o.want.sold / 100), soldH: Math.round(sold.height) });
}

// Geser simpul latar di bawah grid lama — KECUALI simpul kartu flash yang
// sudah dipindah di atas (bug Siklus 68: simpul baru/terpindah ikut tergeser).
const flashNodes = new Set();
for (const o of found) {
  for (const n of [o.card, o.tile, o.badgeRect, o.badgeTxt, o.subTxt, o.priceTxt, o.wasTxt, o.iniTxt, o.nameTxt]) if (n) flashNodes.add(n);
}
let shifted = 0;
for (const n of bgKids) {
  if (!flashNodes.has(n) && n.y >= oldBottom) { n.y += delta; shifted++; }
}
const newH = oldH + delta;
f.resize(390, newH);
if (veil) {
  veil.resize(390, newH);
  for (const n of afterVeilNodes) n.y += delta / 2;
}
return {
  frame: f.name, oldH: Math.round(oldH), newH: Math.round(newH),
  gridTop, oldBottom, newBottom, delta, cardH, row1H, priceH, soldH,
  nameH, subH, shifted, rebuilt,
};
