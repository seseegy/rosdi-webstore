// Repair Siklus 158: kartu modal mobile tidak lagi terpusat vertikal
// (temuan Siklus 157, terukur dari piksel PNG S&K Light: kartu 107px di atas
// tengah frame). Akar: frame tumbuh 3180 -> 3394 di Siklus 154 (+214 di bawah
// grid util) sementara kartu modal diam di y absolutnya.
// Probe Siklus 158 (figma-probe-modal-center-s75.js, read-only) mengukur:
//   S&K Light/Dark:    cardY 1419 h 343, center 1591 vs frameCenter 1697 -> -106
//   Refund Light/Dark: cardY 1450 h 280, center 1590 vs frameCenter 1697 -> -107
//   Masuk Light/Dark:  cardY 1482 h 217, center 1591 vs frameCenter 1590 -> +1
//     (frame Masuk masih 3180 — tidak tumbuh di Siklus 154, jadi SUDAH terpusat
//     dan TIDAK disentuh; hipotesis Siklus 157 soal Masuk terbantah probe ini.)
// Perbaikan: geser kelompok modal (semua simpul SESUDAH Veil — kartu + isi;
// Veil sendiri diam, tingginya sudah = tinggi frame) sebesar -offBy ke bawah
// di 4 frame S&K/Refund. Guard: cardY/cardH harus cocok probe (+-2px),
// veilH harus = frameH, dan jumlah simpul overlay dicatat.
const SPECS = [
  { id: "10:2",   expectY: 1419, expectH: 343 },
  { id: "10:105", expectY: 1419, expectH: 343 },
  { id: "13:2",   expectY: 1450, expectH: 280 },
  { id: "13:111", expectY: 1450, expectH: 280 },
];
const results = [];
for (const spec of SPECS) {
  const f = await figma.getNodeByIdAsync(spec.id);
  if (!f) { results.push({ frame: spec.id, error: "tidak ditemukan" }); continue; }
  const kids = [...f.children];
  const vi = kids.findIndex((c) => /veil/i.test(c.name));
  if (vi < 0) { results.push({ frame: f.name, id: spec.id, error: "veil tidak ada" }); continue; }
  const veil = kids[vi];
  const card = kids[vi + 1];
  if (!card) { results.push({ frame: f.name, id: spec.id, error: "kartu modal tidak ada" }); continue; }
  const cardY0 = Math.round(card.y), cardH0 = Math.round(card.height);
  if (Math.abs(cardY0 - spec.expectY) > 2 || Math.abs(cardH0 - spec.expectH) > 2) {
    results.push({ frame: f.name, id: spec.id, error: "kartu di (" + cardY0 + ", h=" + cardH0 + ") harap (" + spec.expectY + ", h=" + spec.expectH + ")" });
    continue;
  }
  if (Math.round(veil.height) !== Math.round(f.height)) {
    results.push({ frame: f.name, id: spec.id, error: "veilH=" + Math.round(veil.height) + " != frameH=" + Math.round(f.height) });
    continue;
  }
  const overlay = kids.slice(vi + 1);
  const center0 = card.y + card.height / 2;
  const delta = Math.round(f.height / 2 - center0);
  for (const n of overlay) n.y += delta;
  const center1 = card.y + card.height / 2;
  results.push({ frame: f.name, id: spec.id, ok: true, delta,
    cardY0, cardY1: Math.round(card.y),
    center0: Math.round(center0), center1: Math.round(center1),
    frameCenter: Math.round(f.height / 2),
    offByAfter: Math.round(center1 - f.height / 2),
    overlayCount: overlay.length, veilUntouched: Math.round(veil.y) === 0 });
}
return results;
