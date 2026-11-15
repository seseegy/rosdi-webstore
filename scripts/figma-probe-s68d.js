// Probe read-only Siklus 68d: posisi lokal simpul baru di frame modal 10:2 —
// apakah kartu seksi/trust tergeser melewati bawah frame (dugaan bug shift veil)?
const f = await figma.getNodeByIdAsync("10:2");
if (!f) return { error: "frame 10:2 tidak ditemukan" };
const out = { frame: f.name, h: Math.round(f.height), nodes: [] };
for (const c of f.children) {
  if (/^(Pulsa Reguler|Paket Data|Token PLN|Voucher Google Play|Steam Wallet IDR|PlayStation Network ID|Saldo DANA|Saldo GoPay|Saldo OVO|Saldo ShopeePay|Trust )/.test(c.name)) {
    out.nodes.push({ name: c.name, y: Math.round(c.y), bottom: Math.round(c.y + c.height), overB: Math.round(c.y + c.height - f.height) });
  }
}
const heads = f.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters === "Pulsa, Data, PLN & E-Wallet" || t.characters === "Kenapa Rosdi Store").map((t) => ({ chars: t.characters, y: Math.round(t.y) }));
out.heads = heads;
return out;
