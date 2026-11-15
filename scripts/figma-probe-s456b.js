// Probe Figma s456 ide 98 (read-only): cari "Rosdie" di seluruh file.
const out = { rosdi: [], rosdiCount: 0, rosdiVariants: {} };
for (const frame of figma.currentPage.children) {
  for (const t of frame.findAllWithCriteria({ types: ["TEXT"] })) {
    if (/rosdi/i.test(t.characters)) {
      out.rosdiCount++;
      const m = t.characters.match(/rosdi\w*/gi) || [];
      for (const w of m) out.rosdiVariants[w] = (out.rosdiVariants[w] || 0) + 1;
      if (/rosdie/i.test(t.characters)) out.rosdi.push({ frame: frame.name, text: t.characters.slice(0, 90) });
    }
  }
}
return out;
