// Cleanup: hapus frame "Delta Force — Light/Dark" setengah jadi
// dari percobaan builder yang gagal (agar build ulang tidak ganda).
const removed = [];
for (const n of [...figma.currentPage.children]) {
  if (n.type === "FRAME" && (n.name === "Delta Force \u2014 Light" || n.name === "Delta Force \u2014 Dark")) {
    removed.push({ id: n.id, name: n.name, x: n.x, y: n.y });
    n.remove();
  }
}
return { removed };
