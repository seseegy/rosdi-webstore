// Read-only audit s442h (Figma): rantai parent teks "Tutup"/"Syarat & Ketentuan"
// di frame modal — menemukan node kartu modal apa pun tipenya.
const out = { chains: [] };
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
for (const f of frames) {
  if (/^Modal (S&K|Kebijakan Pengembalian|Masuk)/.test(f.name) && !/Desktop/.test(f.name)) {
    const t = f.findAll((n) => n.type === "TEXT" && ((n.characters || "").trim() === "Tutup" || (n.characters || "").includes("Syarat & Ketentuan") || (n.characters || "").includes("Kebijakan Pengembalian") || (n.characters || "").includes("Masuk ke Rosdi Store")));
    for (const txt of t.slice(0, 3)) {
      const chain = [];
      let p = txt.parent, guard = 0;
      while (p && guard < 6) {
        chain.push({ type: p.type, name: (p.name || "").slice(0, 50), w: Math.round(p.width), h: Math.round(p.height), pad: p.type === "FRAME" || p.type === "INSTANCE" || p.type === "GROUP" ? [p.paddingLeft, p.paddingTop, p.paddingRight, p.paddingBottom] : null });
        if (p === f) break;
        p = p.parent; guard++;
      }
      out.chains.push({ frame: f.name, text: (txt.characters || "").slice(0, 40), chain });
    }
  }
}
return out;
