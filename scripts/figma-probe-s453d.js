// Diagnostik node: tipe + nama untuk id-id frame Token PLN.
const out = {};
for (const id of ["2:116", "2:181", "30:2", "30:241"]) {
  const n = figma.getNodeById(id);
  out[id] = n ? { type: n.type, name: n.name } : null;
}
return out;
