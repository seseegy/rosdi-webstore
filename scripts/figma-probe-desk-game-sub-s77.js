// Probe Siklus 77: geometri kartu game di Beranda Desktop Light (20:2).
// Read-only: cari teks sub kartu game (tagline saja) + rect kartu + judul seksi berikut.
const FRAME_ID = "20:2";
const TAGLINES = ["Top up langsung ke akun", "Via UID, pilih server",
  "Top up token langsung ke akun", "Gift card Robux, kode ke email"];
const f = await figma.getNodeByIdAsync(FRAME_ID);
if (!f) return { error: "frame tidak ditemukan", frame: FRAME_ID };
const subs = [], froms = [], cards = [], heads = [];
const walk = (n) => {
  if (n.type === "TEXT") {
    const c = n.characters || "";
    if (TAGLINES.includes(c)) subs.push({ id: n.id, chars: c, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height), fs: n.fontSize, lh: n.lineHeight && n.lineHeight.unit === "PIXELS" ? n.lineHeight.value : null, auto: n.textAutoResize });
    if (c.indexOf("Mulai Rp") === 0) froms.push({ id: n.id, chars: c, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) });
    if (c === "Pulsa, Data, PLN & E-Wallet" || c === "Top Up Game") heads.push({ id: n.id, chars: c, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) });
  }
  if ((n.type === "RECTANGLE" || n.type === "FRAME") && n.width >= 250 && n.width <= 280 && n.height >= 120 && n.height <= 200 && n.y > 600 && n.y < 1100) {
    cards.push({ id: n.id, name: n.name, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) });
  }
  if ("children" in n) for (const c of n.children) walk(c);
};
walk(f);
return { frame: f.name, w: f.width, h: f.height, subs, froms, cards, heads };
