// Discovery s461 (read-only): daftar semua frame tingkat atas (nama + id).
const out = { pages: [] };
for (const page of figma.root.children) {
  const frames = [];
  const walk = (n) => {
    if ((n.type === "FRAME" || n.type === "SECTION") && n.parent === page) frames.push({ name: n.name, id: n.id, type: n.type });
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(page);
  out.pages.push({ page: page.name, frames });
}
out.totalFrames = out.pages.reduce((a, p) => a + p.frames.length, 0);
return out;
