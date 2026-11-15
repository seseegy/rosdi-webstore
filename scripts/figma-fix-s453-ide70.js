// EDIT Figma s453 ide 70: ubah fill teks peringatan "tidak bisa dibatalkan"
// di frame "Token PLN — Desktop — Light" (30:2) dari #059669 (hijau lama,
// pra-s432) menjadi #047857 (--green Light di kode saat ini).
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const fr = figma.getNodeById("30:2");
const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /tidak bisa dibatalkan/i.test(x.characters));
const before = t.fills && t.fills[0] && t.fills[0].type === "SOLID" ? hex(t.fills[0].color) : null;
t.fills = [{ type: "SOLID", color: { r: 4 / 255, g: 120 / 255, b: 87 / 255 } }];
const after = t.fills && t.fills[0] && t.fills[0].type === "SOLID" ? hex(t.fills[0].color) : null;
return { frame: fr.name, text: t.characters.slice(0, 60), before, after, target: "#047857", ok: after === "#047857" };
