// Probe read-only Siklus 68b: peta 6 frame klon Beranda mobile (Light) —
// posisi seksi lama, trust lama, veil + kartu modal, dan simpul terbawah.
const IDS = ["1:105", "10:2", "13:2", "162:2", "15:2", "16:2"];
const out = [];
for (const id of IDS) {
  const f = await figma.getNodeByIdAsync(id);
  if (!f) { out.push({ id, error: "tidak ditemukan" }); continue; }
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const hit = (re) => texts.filter((t) => re.test(t.characters || "")).map((t) => ({
    node: t.id, chars: t.characters.slice(0, 44), y: Math.round(t.y), h: Math.round(t.height),
  }));
  const veil = f.children.find((c) => /veil/i.test(c.name));
  let afterVeil = null;
  if (veil) {
    const idx = f.children.indexOf(veil);
    const rest = f.children.slice(idx + 1);
    afterVeil = {
      veilId: veil.id, veilY: Math.round(veil.y), veilH: Math.round(veil.height),
      nAfter: rest.length,
      minY: rest.length ? Math.round(Math.min(...rest.map((c) => c.y))) : null,
      maxY: rest.length ? Math.round(Math.max(...rest.map((c) => c.y + c.height))) : null,
    };
  }
  const maxY = Math.max(...f.children.map((c) => c.y + c.height));
  out.push({
    id, name: f.name, h: Math.round(f.height),
    sectionHead: hit(/Pulsa, Data/),
    trustHead: hit(/Kenapa Rosdi Store/),
    trustTexts: hit(/Proses instan|Pembayaran aman|Garansi|CS 24\/7|Hitungan detik|QRIS, e-wallet|Uang kembali|Siap membantu/),
    veil: afterVeil, maxChildY: Math.round(maxY),
  });
}
return out;
