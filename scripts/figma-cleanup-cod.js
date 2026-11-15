// Cleanup: hapus frame "Call of Duty: Mobile — Light/Dark" setengah jadi
// dari percobaan builder yang gagal (agar build ulang tidak ganda).
const removed = [];
for (const n of [...figma.currentPage.children]) {
  if (n.type === "FRAME" && (n.name === "Call of Duty: Mobile \u2014 Light" || n.name === "Call of Duty: Mobile \u2014 Dark")) {
    removed.push({ id: n.id, name: n.name, x: n.x, y: n.y });
    n.remove();
  }
}
return { removed };
