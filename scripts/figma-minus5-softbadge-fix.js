// Siklus 97b: lengkapi restyle soft-badge sweep unslop untuk 4 badge "-5%" MLBB
// yang luput (3 masih solid merah + teks putih, 1 rect-nya salah warna #F87171).
// Gaya acuan = badge hasil sweep itu sendiri (FF Desktop Dark 87:308/87:309):
// Light rect #FEF2F2 + teks #DC2626; Dark rect #33161A + teks #F87171.
// Sesuai kode saat ini: .badge { background: var(--red-soft); color: var(--red); }
const SOFT = {
  light: { rect: { r: 254 / 255, g: 242 / 255, b: 242 / 255 }, text: { r: 220 / 255, g: 38 / 255, b: 38 / 255 } },
  dark: { rect: { r: 51 / 255, g: 22 / 255, b: 26 / 255 }, text: { r: 248 / 255, g: 113 / 255, b: 113 / 255 } },
};
const JOBS = [
  { frameId: "1:208", theme: "light", rectId: "1:258", textId: "1:259" },
  { frameId: "1:314", theme: "dark", rectId: "1:364", textId: "1:365" },
  { frameId: "26:2", theme: "light", rectId: "26:83", textId: "26:84" },
  { frameId: "26:281", theme: "dark", rectId: "26:362", textId: "26:363" },
];
const results = [];
for (const job of JOBS) {
  const rect = await figma.getNodeByIdAsync(job.rectId);
  const text = await figma.getNodeByIdAsync(job.textId);
  if (!rect || rect.type !== "RECTANGLE") throw new Error("rect not found: " + job.rectId);
  if (!text || text.type !== "TEXT" || text.characters !== "-5%") throw new Error("text not found: " + job.textId);
  const s = SOFT[job.theme];
  rect.fills = [{ type: "SOLID", color: s.rect }];
  text.fills = [{ type: "SOLID", color: s.text }];
  results.push({ frame: job.frameId, theme: job.theme, rectId: rect.id, textId: text.id });
}
return results;
