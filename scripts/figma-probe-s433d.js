// Probe s433d — read-only: identifikasi node hidden (ide 96) — nama, tipe, teks.
const frames = figma.currentPage.children;
const out = [];
for (const f of frames) {
  const walk = (n, path) => {
    if (n.visible === false) {
      out.push({ frame: f.name, id: f.id, node: n.name.slice(0, 60), type: n.type,
        chars: (n.characters || "").slice(0, 80), path });
    }
    if ("children" in n) for (const c of n.children) walk(c, path + "/" + n.name.slice(0, 20));
  };
  walk(f, "");
}
return { count: out.length, hidden: out };
