// Probe Figma s463-B: node/teks frame Produk Game Desktop 26:2 (Light) — read-only.
const F = (id) => figma.getNodeById(id);
const fr = F("26:2");
if (!fr) return { error: "frame 26:2 tidak ditemukan" };
let nodes = 0;
const walk = (n) => { nodes++; if (n.children) n.children.forEach(walk); };
walk(fr);
const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
return { frame: fr.name + " (" + fr.id + ")", jumlahNode: nodes, jumlahTeks: texts.length, teks: texts };
