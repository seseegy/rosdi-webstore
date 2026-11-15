// Probe read-only Siklus 68c: sapuan pasca-rebuild — 0 teks lama tersisa,
// veil setinggi frame baru, kartu modal tetap terpusat vertikal.
const IDS = ["1:2", "1:105", "10:2", "10:105", "13:2", "13:111", "162:2", "162:111", "15:2", "15:105", "16:2", "16:107"];
const OLD = [/^Pulsa, Data & PLN$/, /^Hitungan detik$/, /^Pembayaran aman$/, /^QRIS, e-wallet, VA$/, /^Uang kembali$/, /^Siap membantu$/];
const out = [];
for (const id of IDS) {
  const f = await figma.getNodeByIdAsync(id);
  if (!f) { out.push({ id, error: "tidak ditemukan" }); continue; }
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const old = texts.filter((t) => OLD.some((re) => re.test(t.characters || ""))).map((t) => t.characters);
  const newHead = texts.filter((t) => t.characters === "Pulsa, Data, PLN & E-Wallet").length;
  const newTrust = texts.filter((t) => /^(Proses instan|Harga transparan|Garansi uang kembali|CS 24\/7)$/.test(t.characters || "")).length;
  const veil = f.children.find((c) => /veil/i.test(c.name));
  let modal = null;
  if (veil) {
    const vi = f.children.indexOf(veil);
    const after = f.children.slice(vi + 1);
    const minY = Math.min(...after.map((c) => c.y));
    const maxY = Math.max(...after.map((c) => c.y + c.height));
    modal = { veilH: Math.round(veil.height), cardY: Math.round(minY), cardBottom: Math.round(maxY), center: Math.round((minY + maxY) / 2), frameCenter: Math.round(f.height / 2) };
  }
  out.push({ id, h: Math.round(f.height), oldTexts: old, newHead, newTrustTitles: newTrust, modal });
}
return out;
