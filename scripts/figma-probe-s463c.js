// Probe Figma s463-C: node/teks frame Token PLN Desktop 30:2 (Light) — read-only.
const F = (id) => figma.getNodeById(id);
const fr = F("30:2");
if (!fr) return { error: "frame 30:2 tidak ditemukan" };
let nodes = 0;
const walk = (n) => { nodes++; if (n.children) n.children.forEach(walk); };
walk(fr);
const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim()).filter(Boolean);
return { frame: fr.name + " (" + fr.id + ")", jumlahNode: nodes, jumlahTeks: texts.length, teks: texts };
