// Probe s436b — read-only: detail node untuk temuan s436 (hitam, radius
// aneh, 15.5px, 9px, letter-spacing). Satu jalan, kumpulkan sampel bernama.
const toHex = (c) => [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const solidHexes = (paints) => (paints || []).filter((p) => p.type === "SOLID" && p.visible !== false).map((p) => toHex(p.color));
const out = { black: [], r17: [], r15: [], r16: [], r11: [], r4: [], r1: [], s155: [], s9: [], ls: [] };
const cap = (arr, item, n) => { if (arr.length < n) arr.push(item); };
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
for (const f of frames) {
  const walk = (n) => {
    if (n.visible !== false) {
      for (const h of solidHexes(n.fills)) if (h === "000000") cap(out.black, { frame: f.name, node: n.name, type: n.type }, 10);
      if (typeof n.cornerRadius === "number") {
        const it = { frame: f.name, node: n.name, type: n.type, r: n.cornerRadius };
        if (n.cornerRadius === 17) cap(out.r17, it, 12);
        if (n.cornerRadius === 15) cap(out.r15, it, 12);
        if (n.cornerRadius === 16) cap(out.r16, it, 12);
        if (n.cornerRadius === 11) cap(out.r11, it, 12);
        if (n.cornerRadius === 4) cap(out.r4, it, 12);
        if (n.cornerRadius === 1) cap(out.r1, it, 12);
      }
      if (n.type === "TEXT") {
        if (n.fontSize === 15.5) cap(out.s155, { frame: f.name, node: n.name, text: (n.characters || "").slice(0, 40) }, 12);
        if (n.fontSize === 9) cap(out.s9, { frame: f.name, node: n.name, text: (n.characters || "").slice(0, 40) }, 12);
        const ls = n.letterSpacing;
        if (ls && ls.value !== 0) cap(out.ls, { frame: f.name, node: n.name, ls: ls.value, unit: ls.unit, text: (n.characters || "").slice(0, 40) }, 25);
      }
    }
    if (n.children) for (const c of n.children) walk(c);
  };
  walk(f);
}
return out;
