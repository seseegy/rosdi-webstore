// Probe read-only Siklus 126: peta seksi "Top Up Game" di Beranda mobile Light (1:2)
// dan Beranda Desktop Light (20:2) — kartu game (posisi/ukuran/isi teks) + y
// seksi berikutnya, untuk menambah 5 kartu game baru (11 total).
function probe(frameId) {
  const f = figma.getNodeById(frameId);
  if (!f) return { frameId, error: "tidak ditemukan" };
  const head = f.findAll((n) => n.type === "TEXT" && n.characters === "Top Up Game")[0];
  const headY = head ? Math.round(head.y) : -1;
  // kartu game: anak langsung FRAME yang y-nya di bawah header dan berisi teks "Mulai Rp"
  const cards = [];
  for (const c of f.children) {
    if (c.type !== "FRAME") continue;
    const texts = c.findAllWithCriteria({ types: ["TEXT"] });
    const from = texts.find((t) => (t.characters || "").startsWith("Mulai Rp"));
    if (!from) continue;
    cards.push({
      id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y),
      w: Math.round(c.width), h: Math.round(c.height),
      texts: texts.map((t) => ({ id: t.id, name: t.name, chars: (t.characters || "").slice(0, 40), x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) })),
    });
  }
  cards.sort((a, b) => a.y - b.y || a.x - b.x);
  // seksi berikutnya: teks header (h2) pertama setelah kartu terakhir
  const lastCardY = cards.length ? cards[cards.length - 1].y + cards[cards.length - 1].h : headY;
  const below = f.findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => t.y > lastCardY && (t.fontSize || 0) >= 15)
    .map((t) => ({ chars: (t.characters || "").slice(0, 40), y: Math.round(t.y) }))
    .sort((a, b) => a.y - b.y).slice(0, 5);
  return { frameId, name: f.name, w: Math.round(f.width), h: Math.round(f.height), headY, nCards: cards.length, cards, below };
}
return { mobile: probe("1:2"), desktop: probe("20:2") };
