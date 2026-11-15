// Read-only audit s442b (Figma): pendalaman ide 81, 85, 86, 87, 90.
const out = {};
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
const hex = (fl) => { if (!fl || fl.type !== "SOLID") return null; const { r, g, b } = fl.color; return "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join(""); };

// 81: daftar lengkap node tersembunyi
out.hiddenList = [];
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    if (n.visible === false) out.hiddenList.push({ frame: f.name, type: n.type, name: (n.name || "").slice(0, 80), x: Math.round(n.x), y: Math.round(n.y) });
  }
}

// 85: constraints — cari container field pencarian & kartu game di Beranda mobile
const beranda = frames.filter((f) => /beranda/i.test(f.name) && f.width <= 400)[0];
out.beranda85 = { frame: beranda ? beranda.name : null };
if (beranda) {
  const all = beranda.findAll(() => true);
  // field pencarian: node yang berisi teks "Cari produk" — ambil parent-nya
  const searchText = all.find((n) => n.type === "TEXT" && (n.characters || "").includes("Cari produk"));
  if (searchText) {
    const p = searchText.parent;
    out.beranda85.searchField = { name: (p.name || "").slice(0, 60), type: p.type, w: Math.round(p.width), x: Math.round(p.x), constraints: p.constraints || null, layoutMode: p.layoutMode || null, layoutAlign: p.layoutAlign || null };
    out.beranda85.searchText = { w: Math.round(searchText.width), constraints: searchText.constraints || null };
  }
  // kartu game: frame yang berisi teks nama game (Mobile Legends dsb.)
  const gameCards = [];
  for (const n of all) {
    if (n.type === "FRAME" && n.name && /mobile legends|free fire|genshin/i.test(n.name)) {
      gameCards.push({ name: n.name.slice(0, 50), w: Math.round(n.width), h: Math.round(n.height), constraints: n.constraints || null, layoutMode: n.layoutMode || null, parent: n.parent ? n.parent.name.slice(0, 40) : null, parentLayout: n.parent ? n.parent.layoutMode : null });
    }
  }
  out.beranda85.gameCards = gameCards.slice(0, 6);
  // grid container kartu game
  const grid = all.find((n) => n.type === "FRAME" && n.layoutMode === "GRID");
  out.beranda85.gridContainer = grid ? { name: grid.name.slice(0, 50), layoutMode: grid.layoutMode, w: Math.round(grid.width) } : null;
}

// 86: padding kartu modal — ukur via bounding box kartu vs teks pertama di dalamnya
out.modalPadding2 = [];
for (const f of frames) {
  if (/Modal (S&K|Kebijakan Pengembalian|Masuk)/.test(f.name) && !/Desktop/.test(f.name)) {
    // kartu modal = child FRAME terbesar yang bukan veil (veil = frame selebar frame)
    const kids = f.children.filter((c) => c.type === "FRAME");
    for (const k of kids) {
      const texts = k.findAll((n) => n.type === "TEXT");
      if (texts.length >= 2) {
        const first = texts[0];
        const padL = Math.round(first.x - k.x);
        const padT = Math.round(first.y - k.y);
        const last = texts[texts.length - 1];
        const padB = Math.round((k.y + k.height) - (last.y + last.height));
        const padR = Math.round((k.x + k.width) - (first.x + first.width));
        out.modalPadding2.push({ frame: f.name, card: (k.name || "").slice(0, 50), w: Math.round(k.width), h: Math.round(k.height), padL, padT, padR, padB, autoPad: [k.paddingLeft, k.paddingTop, k.paddingRight, k.paddingBottom] });
      }
    }
  }
}

// 87: radius tombol "Beli Sekarang" & "Masuk" berdasarkan TEKS, bukan nama node
out.buttonRadii = {};
for (const f of frames) {
  for (const n of f.findAll((x) => x.type === "TEXT")) {
    const ch = (n.characters || "").trim();
    if (ch === "Beli Sekarang" || ch === "Masuk" || ch === "Siap, lanjut belanja" || ch === "Tutup") {
      let p = n.parent;
      // naik sampai ketemu frame dengan cornerRadius
      let guard = 0;
      while (p && guard < 4) {
        if (typeof p.cornerRadius === "number" && p.type !== "TEXT") break;
        p = p.parent; guard++;
      }
      const r = p && typeof p.cornerRadius === "number" ? p.cornerRadius : null;
      const key = ch;
      out.buttonRadii[key] = out.buttonRadii[key] || {};
      out.buttonRadii[key][String(r)] = (out.buttonRadii[key][String(r)] || 0) + 1;
    }
  }
}
// radius input berdasarkan teks placeholder di halaman produk
out.inputRadii = {};
for (const f of frames) {
  if (/Produk Game|Pulsa|PLN|Voucher|E-Wallet|Cek Transaksi/.test(f.name)) {
    for (const n of f.findAll((x) => x.type === "TEXT")) {
      const ch = (n.characters || "").trim();
      if (/^12345678$|^08x|^nama@email|^11–12 digit/.test(ch)) {
        let p = n.parent, guard = 0;
        while (p && guard < 4) { if (typeof p.cornerRadius === "number" && p.type !== "TEXT") break; p = p.parent; guard++; }
        const r = p && typeof p.cornerRadius === "number" ? p.cornerRadius : null;
        out.inputRadii[String(r)] = (out.inputRadii[String(r)] || 0) + 1;
      }
    }
  }
}

// 90: warna fill divider rect 1px — cocok token line?
out.dividerFills = {};
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    if (n.type === "RECTANGLE" && Math.round(n.height) === 1) {
      const fills = (n.fills || []).filter((fl) => fl.type === "SOLID").map(hex);
      const key = fills.join(",") || "tanpa-solid-fill";
      out.dividerFills[key] = (out.dividerFills[key] || 0) + 1;
    }
  }
}
// 89: rincian glif per karakter
out.glyphByChar = {};
for (const f of frames) {
  for (const n of f.findAll((n2) => n2.type === "TEXT")) {
    const ch = (n.characters || "").trim();
    if (ch.length <= 2 && ["✓", "‹", "›", "▾", "▸", "×", "−", "+", "•"].includes(ch)) {
      out.glyphByChar[ch] = (out.glyphByChar[ch] || 0) + 1;
    }
  }
}
out.glyphSamples = [];
for (const f of frames) {
  for (const n of f.findAll((n2) => n2.type === "TEXT")) {
    const ch = (n.characters || "").trim();
    if (ch.length <= 2 && ["✓", "‹", "›", "▾", "▸", "×", "−", "+", "•"].includes(ch) && out.glyphSamples.length < 25) {
      out.glyphSamples.push({ frame: f.name, text: ch, name: (n.name || "").slice(0, 60) });
    }
  }
}
return out;
