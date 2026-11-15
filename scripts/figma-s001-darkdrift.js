// Probe read-only batch s001: drift token biru di frame DARK.
// Siklus 429 mengubah: --blue-strong dark kini #2563EB (dulu #60A5FA),
// --blue-text dark kini #60A5FA (dulu #3B82F6). Hitung pemakaian nilai LAMA
// di frame Dark: teks biru #3B82F6, fill latar chip/tab/step-num #60A5FA,
// dan bandingkan dengan nilai BARU (#60A5FA teks, #2563EB fill).
// Juga: cek fill biru #2563EB di frame LIGHT (seharusnya --blue) vs #1D4ED8.
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
const page = figma.currentPage;
const frames = page.children.filter((n) => n.type === "FRAME");
const darkOld = [], darkNew = [], lightBlue = [];
for (const f of frames) {
  const isDark = /dark/i.test(f.name);
  const all = f.findAll(() => true);
  for (const n of all) {
    const fills = Array.isArray(n.fills) ? n.fills.filter((p) => p && p.type === "SOLID" && p.color).map((p) => hex(p.color).toLowerCase()) : [];
    if (!fills.length) continue;
    if (isDark) {
      if (n.type === "TEXT" && fills.includes("#3b82f6")) darkOld.push({ frame: f.name, node: n.name, chars: String(n.characters).slice(0, 40), hex: "#3B82F6 teks (lama)" });
      if (n.type !== "TEXT" && fills.includes("#60a5fa")) darkOld.push({ frame: f.name, node: n.name, type: n.type, hex: "#60A5FA fill (lama)" });
      if (n.type === "TEXT" && fills.includes("#60a5fa") && darkNew.filter((d) => d.hex === "#60A5FA teks (baru)").length < 200) darkNew.push({ frame: f.name, node: n.name, hex: "#60A5FA teks (baru)" });
      if (n.type !== "TEXT" && fills.includes("#2563eb") && darkNew.filter((d) => d.hex === "#2563EB fill (baru)").length < 200) darkNew.push({ frame: f.name, node: n.name, type: n.type, hex: "#2563EB fill (baru)" });
    } else {
      if (fills.includes("#1d4ed8")) lightBlue.push({ frame: f.name, node: n.name, type: n.type, hex: "#1D4ED8 (blue-strong light)" });
    }
  }
}
const countBy = (arr) => { const m = {}; for (const a of arr) m[a.hex] = (m[a.hex] || 0) + 1; return m; };
return {
  darkOldCount: darkOld.length, darkOldByHex: countBy(darkOld),
  darkOldSample: darkOld.slice(0, 25),
  darkNewByHex: countBy(darkNew),
  lightStrongCount: lightBlue.length, lightStrongSample: lightBlue.slice(0, 10),
};
