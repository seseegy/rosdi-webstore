// Read-only probe Siklus 431c: teks lengkap modal S&K + Refund (Light) dan
// anak tingkat atas frame Cek Desktop 36:2 (lebar kartu konten).
const byId = {};
for (const f of figma.currentPage.children) byId[f.id] = f;
const out = { sk: null, refund: null, cekChildren: [] };
for (const [fid, key] of [["10:2", "sk"], ["13:2", "refund"]]) {
  const frame = byId[fid];
  const fb = frame.absoluteBoundingBox;
  // kartu modal: RECT/FRAME terbesar di tengah atas yang memuat judul
  const title = frame.findAllWithCriteria({ types: ["TEXT"] })
    .find((t) => /Syarat & Ketentuan|Kebijakan Pengembalian/.test(t.characters));
  const ty = title ? title.absoluteBoundingBox.y - fb.y : -1;
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => { const y = t.absoluteBoundingBox.y - fb.y; return y >= ty - 5 && y <= ty + 400; })
    .map((t) => t.characters);
  out[key] = { titleY: Math.round(ty), texts };
}
{
  const frame = byId["36:2"];
  out.cekChildren = frame.children.map((c) => ({ name: c.name.slice(0, 30), x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
}
return out;
