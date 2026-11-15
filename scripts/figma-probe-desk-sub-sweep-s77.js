// Probe Siklus 77: sapuan seluruh file — frame mana saja yang masih memakai
// sub kartu game tagline-saja (tanpa publisher) di fontSize 12.5 (kartu game).
// Read-only.
const TAGLINES = ["Top up langsung ke akun", "Via UID, pilih server",
  "Top up token langsung ke akun", "Gift card Robux, kode ke email"];
const rows = [];
for (const page of figma.root.children) {
  for (const f of page.children) {
    if (f.type !== "FRAME") continue;
    let n = 0;
    const walk = (node) => {
      if (node.type === "TEXT" && node.fontSize === 12.5 && TAGLINES.includes(node.characters || "")) n++;
      if ("children" in node) for (const c of node.children) walk(c);
    };
    walk(f);
    if (n > 0) rows.push({ frame: f.name, id: f.id, taglineSubs: n });
  }
}
return { frames: rows.length, rows };
