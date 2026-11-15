// Read-only: pastikan tidak ada lagi teks "Admin sudah termasuk" di seluruh file (Siklus 53).
const hits = [];
for (const page of figma.root.children) {
  const texts = page.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    if (t.characters === "Admin sudah termasuk") hits.push(t.id);
    if (t.characters === "Biaya admin sudah termasuk") hits.push("OK:" + t.id);
  }
}
const oldCount = hits.filter(h => !h.startsWith("OK")).length;
const newCount = hits.filter(h => h.startsWith("OK")).length;
return { oldMetaRemaining: oldCount, newMetaCount: newCount, oldIds: hits.filter(h => !h.startsWith("OK")) };
