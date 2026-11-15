// Repair Siklus 68: kembalikan simpul baru di frame modal yang ikut tergeser
// +459.5 oleh bug shift veil (simpul baru ter-append setelah veil lalu ikut
// digeser bersama kartu modal). Kriteria: simpul latar (sebelum veil) dengan
// y >= 1272, kecuali judul trust "Kenapa Rosdi Store" (y=1751, sudah benar).
// Geser = 813 - minY kandidat (813 = grid top yang benar) — kalibrasi diri,
// bukan angka hardcode. Dijalankan lewat use_figma; placeholder __FRAME__ diisi driver.
const FRAME_ID = "__FRAME__";
const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const kids = [...f.children];
const veil = kids.find((c) => /veil/i.test(c.name));
if (!veil) return { error: "veil tidak ditemukan — bukan frame modal", frame: FRAME_ID };
const bgKids = kids.slice(0, kids.indexOf(veil));
const cand = bgKids.filter((c) => c.y >= 1272 && !(c.type === "TEXT" && c.characters === "Kenapa Rosdi Store"));
if (cand.length === 0) return { error: "tidak ada kandidat", frame: FRAME_ID };
const minY = Math.min(...cand.map((c) => c.y));
const dy = 813 - minY;
for (const n of cand) n.y += dy;
const maxB = Math.max(...cand.map((c) => c.y + c.height));
const trustHead = f.findAllWithCriteria({ types: ["TEXT"] }).find((t) => t.characters === "Kenapa Rosdi Store");
return {
  frame: f.name, h: Math.round(f.height), shifted: cand.length,
  minYBefore: minY, dy, maxBottomAfter: Math.round(maxB),
  trustHeadY: trustHead ? Math.round(trustHead.y) : null,
  ok: Math.abs(maxB - 2116) < 1,
};
