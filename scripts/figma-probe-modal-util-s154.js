// Probe read-only Siklus 154: grid util + veil + kartu modal di latar
// frame modal S&K (10:2/10:105) + Refund (13:2/13:111).
function probe(frameId) {
  const f = figma.getNodeById(frameId);
  if (!f) return { frameId, error: "tidak ditemukan" };
  const head = f.findAll((n) => n.type === "TEXT" && (n.characters || "").indexOf("Pulsa, Data, PLN") === 0)[0];
  const headY = head ? Math.round(head.y) : -1;
  const trust = f.findAll((n) => n.type === "TEXT" && (n.characters || "").indexOf("Kenapa Rosdi Store") === 0)[0];
  const trustY = trust ? Math.round(trust.y) : -1;
  const veil = f.findAll((n) => (n.name || "").indexOf("Veil") === 0)[0];
  const cards = [];
  for (const c of f.children) {
    if (c.type !== "RECTANGLE" || headY < 0 || c.y < headY) continue;
    if ((c.name || "").indexOf("Card ") === 0) continue; // desktop pakai "Card X"
    // kartu util mobile: rect 173 lebar, nama = nama kartu
    if (Math.round(c.width) !== 173) continue;
    const nameNode = f.findAll((n) => n.type === "TEXT" && Math.abs((n.x + n.width / 2) - (c.x + c.width / 2)) < 3 && n.y > c.y && n.y < c.y + 80)[0];
    cards.push({ id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height), nameText: nameNode ? nameNode.characters : "" });
  }
  cards.sort((a, b) => a.y - b.y || a.x - b.x);
  const pulsaSub = f.findAll((n) => n.type === "TEXT" && (n.characters || "").indexOf("Telkomsel, Indosat") === 0)[0];
  return {
    frameId, name: f.name, w: Math.round(f.width), h: Math.round(f.height),
    headY, trustY, nCards: cards.length, cards,
    pulsaSub: pulsaSub ? { chars: pulsaSub.characters, h: Math.round(pulsaSub.height) } : null,
    veil: veil ? { id: veil.id, name: veil.name, y: Math.round(veil.y), h: Math.round(veil.height) } : null,
  };
}
return { skL: probe("10:2"), skD: probe("10:105"), rfL: probe("13:2"), rfD: probe("13:111") };
