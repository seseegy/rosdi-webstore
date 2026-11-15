const page = figma.currentPage;
const frames = [];
for (const n of page.children) {
  if (n.type === "FRAME") {
    frames.push({ id: n.id, name: n.name, w: Math.round(n.width), h: Math.round(n.height), x: Math.round(n.x), y: Math.round(n.y) });
  }
}
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
return { count: frames.length, frames };
