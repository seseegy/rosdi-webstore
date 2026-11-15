// Cleanup: hapus frame "Arena of Valor — Light/Dark" setengah jadi
// dari percobaan builder yang gagal (agar build ulang tidak ganda).
const removed = [];
for (const n of [...figma.currentPage.children]) {
  if (n.type === "FRAME" && (n.name === "Arena of Valor \u2014 Light" || n.name === "Arena of Valor \u2014 Dark")) {
    removed.push({ id: n.id, name: n.name, x: n.x, y: n.y });
    n.remove();
  }
}
return { removed };
