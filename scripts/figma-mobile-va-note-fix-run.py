#!/usr/bin/env python3
"""Siklus 30: perbaiki catatan VA Langkah 4 yang meluber dari kartu di frame
mobile Produk Game (MLBB) + Genshin Impact, Light+Dark (4 frame).

Temuan QA visual ulang Siklus 30: teks catatan
"Virtual Account · BCA RpXX.000 (biaya Rp2.500) · Danamon: lagi perbaikan"
membungkus 2 baris (h=26) sementara kartu Langkah 4 hanya setinggi 252px —
baris ke-2 ("perbaikan") jatuh 12px DI LUAR kartu, di celah sebelum kartu
Langkah 5. Terlihat di screenshot Light+Dark kedua frame; terkonfirmasi
geometri API (teks bottom 878 vs kartu bottom 866 di MLBB; 928 vs 916 di
Genshin). Akar masalah: kartu dibangun dengan asumsi catatan 1 baris.

Perbaikan per frame: kartu Langkah 4 +16px (252 -> 268, padding bawah
teks jadi 4px), semua simpul di bawah kartu geser +16, tinggi frame +16.
Tidak ada teks yang diubah, jadi harga tidak berubah.
"""
import json, subprocess, sys

CODE = r"""
const THEMES = [
  { frame: '1:208', card: '1:270' },  // MLBB Light, kartu y=614 h=252 bottom=866
  { frame: '1:314', card: '1:376' },  // MLBB Dark
  { frame: '6:2',   card: '6:64'  },  // Genshin Light, kartu y=664 h=252 bottom=916
  { frame: '6:108', card: '6:170' },  // Genshin Dark
];
const SHIFT = 16;
const out = [];
for (const t of THEMES) {
  const frame = figma.getNodeById(t.frame);
  const card = figma.getNodeById(t.card);
  const oldBottom = card.y + card.height;
  card.resize(card.width, card.height + SHIFT);
  let shifted = 0;
  for (const ch of frame.children) {
    if (ch.id !== t.card && ch.y >= oldBottom) { ch.y += SHIFT; shifted++; }
  }
  const newH = frame.height + SHIFT;
  frame.resize(frame.width, newH);
  // verifikasi: teks VA kini di dalam kartu
  const va = frame.findAllWithCriteria({ types: ['TEXT'] })
    .find(n => n.characters.includes('Danamon: lagi perbaikan'));
  out.push({ frame: t.frame, cardBottom: card.y + card.height,
    vaBottom: va.y + va.height, inside: (va.y + va.height) <= (card.y + card.height),
    shiftedBelow: shifted, frameH: frame.height });
}
return out;
"""

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "code": CODE,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
    "description": "Siklus 30: perbaiki catatan VA Langkah 4 yang meluber dari kartu di frame mobile MLBB + Genshin (Light+Dark)",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args)],
    capture_output=True, text=True, timeout=180)
print(r.stdout)
print(r.stderr, file=sys.stderr)
