// Probe Figma s464 E56/E62-E64 (read-only): node/teks 4 frame Desktop + 1 frame modal.
const frameTexts = (fid) => {
  const fr = figma.getNodeById(fid);
  if (!fr) return { error: "frame tidak ditemukan: " + fid };
  let nodes = 0;
  const walk = (n) => { nodes++; if (n.children) n.children.forEach(walk); };
  walk(fr);
  const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
  return { frame: fr.name + " (" + fr.id + ")", jumlahNode: nodes, jumlahTeks: texts.length, teks: texts };
};
const out = {};
out.pulsa_telkomsel_light = frameTexts("28:2");
out.pulsa_telkomsel_dark = frameTexts("28:259");
out.saldo_dana_light = frameTexts("31:2");
out.saldo_dana_dark = frameTexts("31:251");
out.voucher_gp_light = frameTexts("33:2");
out.voucher_gp_dark = frameTexts("33:239");
out.modal_sk_light = frameTexts("10:2");
out.modal_sk_dark = frameTexts("10:105");
return out;
