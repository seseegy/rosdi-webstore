// Diagnosis B3-3a — read-only: untuk tiap frame yang punya teks "Tagihan",
// laporkan apakah baris chip-nya asli (ada "Semua"+"Top Up Game" di y yang
// sama) serta semua teks label chip + posisinya.
const out = { genuine: [], bogus: [] };
const LABELS = ["Semua", "Top Up Game", "Pulsa", "Paket Data", "Pulsa & Data", "Token PLN", "Tagihan", "E-Wallet", "Voucher"];
const frames = new Map();
for (const t of figma.root.findAllWithCriteria({ types: ["TEXT"] })) {
  if (t.characters.trim() === "Tagihan") {
    let p = t.parent;
    while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") { if (!frames.has(p.id)) frames.set(p.id, p); break; } p = p.parent; }
  }
}
for (const frame of frames.values()) {
  const labels = frame.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => LABELS.includes(t.characters.trim()))
    .map((t) => ({ text: t.characters, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width) }));
  const tagihan = labels.filter((l) => l.text === "Tagihan");
  const rowY = tagihan.length ? tagihan[0].y : null;
  const hasSemua = labels.some((l) => l.text === "Semua" && Math.abs(l.y - rowY) <= 2);
  const hasTUG = labels.some((l) => l.text === "Top Up Game" && Math.abs(l.y - rowY) <= 2);
  const entry = { frame: frame.name, id: frame.id, tagihan, labels };
  if (hasSemua && hasTUG) out.genuine.push(entry); else out.bogus.push(entry);
}
out.counts = { genuine: out.genuine.length, bogus: out.bogus.length };
return out;
