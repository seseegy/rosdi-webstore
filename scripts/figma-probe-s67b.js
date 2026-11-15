// Probe read-only Siklus 67b: apakah frame Beranda mobile (1:2) memuat kartu
// e-wallet sama sekali (sapuan "Admin sudah termasuk" Siklus 67 tidak menemukan
// satu pun di 1:2, padahal Beranda Desktop punya 4) — dan kartu apa saja yang
// ada di seksi "Pulsa, Data & PLN" mobile.
const f = await figma.getNodeByIdAsync("1:2");
if (!f) return { error: "frame 1:2 tidak ditemukan" };
const texts = f.findAllWithCriteria({ types: ["TEXT"] });
const hit = (re) => texts.filter((t) => re.test(t.characters || "")).map((t) => ({
  node: t.id, chars: t.characters.slice(0, 60), x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height),
}));
return {
  frame: f.name, w: Math.round(f.width), h: Math.round(f.height),
  dana: hit(/DANA|GoPay|OVO|ShopeePay/),
  emoneyFrom: hit(/Dari Rp10\.292/),
  admin: hit(/Admin sudah termasuk/),
  sectionHeads: hit(/Pulsa, Data|E-Wallet|Voucher|Top Up Game|Populer/),
};
