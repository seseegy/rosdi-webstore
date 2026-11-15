// Probe Figma s458 ide 54-61 (read-only): gap antar kartu langkah, lebar input, lebar baris bayar — via nama node.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) }; };
const out = {};
const FRAMES = { game26: "26:2", tsel28: "28:2", pln30: "30:2", dana31: "31:2", gp33: "33:2" };
for (const [key, fid] of Object.entries(FRAMES)) {
  const fr = F(fid);
  const steps = fr.findAll((n) => /^Step\dCard$/.test(n.name))
    .map((n) => ({ n: n.name, ...box(n) }))
    .sort((a, b) => a.y - b.y);
  const gaps = [];
  for (let i = 0; i + 1 < steps.length; i++) {
    gaps.push({ dari: steps[i].n, ke: steps[i + 1].n, gap: r1(steps[i + 1].y - (steps[i].y + steps[i].h)) });
  }
  const inputs = fr.findAll((n) => /^Input /.test(n.name)).map((n) => ({ n: n.name, ...box(n) }));
  out[key] = { frame: fr.name, steps, gaps, inputs };
}
// 61: lebar baris metode di 26:2 (rect "Pay <nama>" — bukan PayMark).
{
  const fr = F("26:2");
  const pays = fr.findAll((n) => /^Pay (QRIS|GoPay|DANA|OVO|ShopeePay|BCA|Mandiri|BRI|Danamon|Alfamart|Indomaret|Pulsa Telkomsel|Pulsa XL)$/.test(n.name))
    .map((n) => ({ n: n.name, ...box(n) }));
  out.i61_payRows = pays;
}
return out;
