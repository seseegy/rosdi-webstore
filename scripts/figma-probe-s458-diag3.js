// Diagnostik 3 (read-only): nama anak langsung frame Desktop 26:2 saja (ringkas).
const F = (id) => figma.getNodeById(id);
const fr = F("26:2");
const out = { frame: fr.name, count: fr.children.length, names: fr.children.map((c) => c.type + " :: " + c.name) };
return out;
