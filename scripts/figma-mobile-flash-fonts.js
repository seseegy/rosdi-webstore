// Rescale Siklus 74: font kartu Flash Sale mobile ke ukuran kode.
// Kode (src/pages/Home.jsx + src/index.css): nama 14.5/600, sub .p-sub 12.5,
// harga 16/700, coret .was 12, badge .badge 10.5/700, Terjual .p-sub 12.5,
// inisial tile .tile 15 (sudah benar, tidak disentuh).
// Frame saat ini (Siklus 73): nama 12.5 / sub 11 / harga 14 / coret 10.5 /
// badge 9.5 / Terjual 11 — skala ~0.86x. Tinggi kartu dihitung ulang dari
// tinggi teks terukur (bukan asumsi); simpul di bawah grid geser delta;
// veil diresize + kartu modal geser delta/2 (pola Siklus 68/69).
// Kartu game TIDAK disentuh siklus ini: layout-nya horizontal 174x92 (bukan
// vertikal seperti kode) sehingga nama 14.5px tidak muat di slot 100px, dan
// HoK/Roblox belum ada di frame — rebuild grid game jadi unit siklus berikut.
// Dijalankan lewat use_figma; placeholder __FRAME__/__EXPECTED__ diisi driver.
// EXPECTED "both": 2 kartu (Weekly Diamond Pass + 70 Diamonds).
// EXPECTED "weekly": hanya Weekly Diamond Pass (frame pencarian mlbb).
const FRAME_ID = "__FRAME__";
const EXPECTED = "__EXPECTED__";

const CARDS = [
  { name: "Weekly Diamond Pass", sub: "Mobile Legends", sold: 68 },
  { name: "70 Diamonds", sub: "Free Fire", sold: 81 },
];
const WANT = EXPECTED === "weekly" ? [CARDS[0]] : CARDS;
// Target ukuran font dari kode.
const FS = { name: 14.5, sub: 12.5, price: 16, was: 12, badge: 10.5, sold: 12.5 };

async function setSize(node, size) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.fontSize = size;
}

const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const oldH = f.height;
const kids = [...f.children];
const veil = kids.find((c) => /veil/i.test(c.name));
const afterVeilNodes = veil ? [...kids.slice(kids.indexOf(veil) + 1)] : [];
const bgKids = veil ? kids.slice(0, kids.indexOf(veil)) : kids;
const texts = f.findAllWithCriteria({ types: ["TEXT"] });

// Temukan tiap kartu lewat teks namanya + rect 358x136 yang memuatnya.
const found = [];
for (const want of WANT) {
  const nameTxt = texts.find((t) => t.characters === want.name);
  if (!nameTxt) return { error: "teks nama tidak ditemukan", name: want.name, frame: FRAME_ID };
  const card = bgKids.find((c) => c.type === "RECTANGLE" && Math.round(c.width) === 358 && Math.round(c.height) === 136
    && nameTxt.x >= c.x - 1 && nameTxt.y >= c.y - 1
    && nameTxt.x + nameTxt.width <= c.x + 359 && nameTxt.y + nameTxt.height <= c.y + 137);
  if (!card) return { error: "rect kartu 358x136 tidak ditemukan", name: want.name, frame: FRAME_ID };
  const members = bgKids.filter((c) => c !== card
    && c.x >= card.x - 1 && c.y >= card.y - 1
    && c.x + c.width <= card.x + 359 && c.y + c.height <= card.y + 137);
  const tile = members.find((c) => c.type === "RECTANGLE" && Math.round(c.width) === 46 && Math.round(c.height) === 46);
  const badgeRect = members.find((c) => c.type === "RECTANGLE" && Math.round(c.width) === 36 && Math.round(c.height) === 18);
  const badgeTxt = members.find((c) => c.type === "TEXT" && c.characters === "-10%");
  const subTxt = members.find((c) => c.type === "TEXT" && c.characters === want.sub);
  const soldTxt = members.find((c) => c.type === "TEXT" && (c.characters || "").indexOf("Terjual " + want.sold + "%") === 0);
  const track = members.find((c) => c.type === "RECTANGLE" && c.name === "Progress " + want.name);
  const fill = members.find((c) => c.type === "RECTANGLE" && c.name === "Progress isi " + want.name);
  const iniTxt = members.find((c) => c.type === "TEXT" && (c.characters === "ML" || c.characters === "FF"));
  const rpTexts = members.filter((c) => c.type === "TEXT" && /^Rp/.test(c.characters || ""));
  rpTexts.sort((a, b) => b.fontSize - a.fontSize);
  const priceTxt = rpTexts[0];
  const wasTxt = rpTexts[1];
  if (!tile || !badgeRect || !badgeTxt || !subTxt || !priceTxt || !wasTxt || !soldTxt || !track || !fill) {
    return { error: "anggota kartu tidak lengkap", name: want.name, frame: FRAME_ID,
      got: { tile: !!tile, badgeRect: !!badgeRect, badgeTxt: !!badgeTxt, subTxt: !!subTxt, priceTxt: !!priceTxt, wasTxt: !!wasTxt, soldTxt: !!soldTxt, track: !!track, fill: !!fill, iniTxt: !!iniTxt } };
  }
  found.push({ want, card, tile, badgeRect, badgeTxt, subTxt, priceTxt, wasTxt, soldTxt, track, fill, iniTxt, nameTxt });
}
if (found.length !== WANT.length) return { error: "jumlah kartu tidak cocok", found: found.length, want: WANT.length, frame: FRAME_ID };

// 1) Set ukuran font ke ukuran kode, lalu ukur tinggi teks (bukan asumsi).
for (const o of found) {
  await setSize(o.nameTxt, FS.name);
  await setSize(o.subTxt, FS.sub);
  await setSize(o.priceTxt, FS.price);
  await setSize(o.wasTxt, FS.was);
  await setSize(o.badgeTxt, FS.badge);
  await setSize(o.soldTxt, FS.sold);
}
const gridTop = Math.round(found[0].card.y);
const oldBottom = Math.round(Math.max(...found.map((o) => o.card.y + o.card.height)));
const gap = 12;
const rebuilt = [];
for (let i = 0; i < found.length; i++) {
  const o = found[i];
  const nameH = Math.round(o.nameTxt.height);
  const subH = Math.round(o.subTxt.height);
  const priceH = Math.round(o.priceTxt.height);
  const wasH = Math.round(o.wasTxt.height);
  const soldH = Math.round(o.soldTxt.height);
  const row1H = Math.max(46, nameH + 3 + subH);
  const cardH = 14 + row1H + 10 + priceH + 10 + 6 + 6 + soldH + 14;
  const Y = gridTop + (i === 0 ? 0 : rebuilt[0].cardH + gap);
  const stackH = nameH + 3 + subH;
  const nameY = Y + 14 + Math.round((row1H - stackH) / 2);
  // Kartu.
  o.card.resize(358, cardH);
  o.card.x = 16; o.card.y = Y;
  // Tile tetap 46x46.
  o.tile.x = 30; o.tile.y = Y + 14;
  // Nama + sub di samping tile, rata tengah vertikal terhadap baris 1.
  o.nameTxt.x = 88; o.nameTxt.y = nameY;
  o.subTxt.x = 88; o.subTxt.y = nameY + nameH + 3;
  // Badge rata kanan kartu, tengah vertikal baris 1; teks terpusat di rect.
  o.badgeRect.x = 324; o.badgeRect.y = Y + 14 + Math.round((row1H - 18) / 2);
  o.badgeTxt.x = Math.round(o.badgeRect.x + 18 - o.badgeTxt.width / 2);
  o.badgeTxt.y = Math.round(o.badgeRect.y + 9 - o.badgeTxt.height / 2);
  // Harga + coret (coret sejajar tengah harga, dihitung dari tinggi terukur).
  const priceY = Y + 14 + row1H + 10;
  o.priceTxt.x = 30; o.priceTxt.y = priceY;
  o.wasTxt.x = Math.round(30 + o.priceTxt.width + 8);
  o.wasTxt.y = priceY + Math.round((priceH - wasH) / 2);
  // Progress + Terjual.
  const progY = priceY + priceH + 10;
  o.track.x = 30; o.track.y = progY;
  o.fill.x = 30; o.fill.y = progY;
  o.soldTxt.x = 30; o.soldTxt.y = progY + 6 + 6;
  rebuilt.push({ card: o.want.name, y: Y, cardH, row1H, nameH, subH, priceH, wasH, soldH,
    soldW: Math.round(o.soldTxt.width) });
}
const newBottom = gridTop + rebuilt.reduce((s, r) => s + r.cardH, 0) + (rebuilt.length - 1) * gap;
const delta = newBottom - oldBottom;

// 2) Geser simpul latar di bawah grid lama (kecuali anggota kartu flash).
const flashNodes = new Set();
for (const o of found) {
  for (const n of [o.card, o.tile, o.badgeRect, o.badgeTxt, o.subTxt, o.priceTxt, o.wasTxt, o.soldTxt, o.track, o.fill, o.iniTxt, o.nameTxt]) if (n) flashNodes.add(n);
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
  gridTop, oldBottom, newBottom, delta, shifted,
  veil: !!veil, modalShift: veil ? delta / 2 : 0,
  rebuilt,
};
