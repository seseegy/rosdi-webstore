// Read-only: cari node id teks "XL" di frame Indeks Pulsa Mobile Light (54:22).
const fr = figma.getNodeById("54:22");
const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => x.characters === "XL");
return t ? { id: t.id, fontSize: t.fontSize, name: t.name } : null;
