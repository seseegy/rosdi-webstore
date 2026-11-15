// Read-only: struktur kartu Langkah 2 frame E-Wallet Light (Siklus 53).
const frame = await figma.getNodeByIdAsync("3:2");
const fb = frame.absoluteBoundingBox;
const rel = n => { const b = n.absoluteBoundingBox; return { x: +(b.x - fb.x).toFixed(1), y: +(b.y - fb.y).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
const kids = frame.children.filter(c => c.y >= 200 && c.y < 700).map(c => ({ id: c.id, name: c.name.slice(0, 30), type: c.type, ...rel(c), chars: c.type === "TEXT" ? c.characters.slice(0, 40) : undefined }));
return { frameH: frame.height, count: kids.length, kids };
