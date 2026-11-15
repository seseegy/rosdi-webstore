#!/usr/bin/env python3
"""Transform builder AoV -> Delta Force (Siklus 120, Tahap 5 game ke-5/terakhir).
Ganti hanya string distintif (bukan sed global atas nama pendek — pelajaran
Siklus 119: 'cod' -> 'aov' merusak kata 'code')."""
import re, sys

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-game-aov.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-game-df.js"
s = open(SRC, encoding="utf-8").read()

# --- blok ITEMS diganti utuh ---
old_items = re.search(r"const ITEMS = \[.*?\];\n", s, re.S).group(0)
new_items = """const ITEMS = [
  { name: "60 Delta Coins", price: "Rp15.000" },
  { name: "300 Delta Coins", price: "Rp74.000", badge: "Terlaris" },
  { name: "680 Delta Coins", price: "Rp164.000" },
  { name: "1980 Delta Coins", price: "Rp479.000" },
  { name: "3280 Delta Coins", price: "Rp789.000" },
];
"""
s = s.replace(old_items, new_items)

reps = [
    # header komentar
    ("Arena of Valor", "Delta Force"),
    ("arena-of-valor", "delta-force"),
    ("game baru ke-4 dari 5\n// (Valorant, CoD Mobile, Wild Rift sudah; tersisa Delta Force mobile).",
     "game baru ke-5/terakhir dari 5\n// (Valorant, CoD Mobile, Wild Rift, AoV sudah)."),
    ('"Voucher", 5 item, Terlaris 230 Voucher Rp72.000', '"Delta Coins", 5 item, Terlaris 300 Delta Coins Rp74.000'),
    ("(1 tab Voucher;", "(1 tab Delta Coins;"),
    ("Contoh terpilih: 230 Voucher Rp72.000 (Terlaris, sama",
     "Contoh terpilih: 300 Delta Coins Rp74.000 (Terlaris, sama"),
    ("AoV needsZone false", "DF needsZone false"),
    # data
    ("const SELECTED = 2; // 230 Voucher Rp72.000", "const SELECTED = 1; // 300 Delta Coins Rp74.000"),
    ('tile.fills = solid("#0f766e"); // teal, warna game delta-force di data.js',
     'tile.fills = solid("#1e3a8a"); // biru gelap, warna game delta-force di data.js'),
    ('await setText(ini, "AV");', 'await setText(ini, "DF");'),
    ('if (title.x + Math.ceil(m.w) > 318) throw new Error("judul AoV menabrak Cek ID: right=" + (title.x + Math.ceil(m.w)));',
     'if (title.x + Math.ceil(m.w) > 318) throw new Error("judul DF menabrak Cek ID: right=" + (title.x + Math.ceil(m.w)));'),
    ('if (sub.x + sub.width > 318) throw new Error("sub AoV menabrak Cek ID: right=" + (sub.x + sub.width));',
     'if (sub.x + sub.width > 318) throw new Error("sub DF menabrak Cek ID: right=" + (sub.x + sub.width));'),
    # tab: "Voucher" -> "Delta Coins" (hanya 2 kemunculan tersisa pasca-blok ITEMS)
    ('measureNodeText(tabText, "Voucher")', 'measureNodeText(tabText, "Delta Coins")'),
    ('await setText(tabText, "Voucher");', 'await setText(tabText, "Delta Coins");'),
    ('// ---- tab Langkah 2: 3 tab -> 1 tab "Voucher" ----',
     '// ---- tab Langkah 2: 3 tab -> 1 tab "Delta Coins" ----'),
    ("Pulsa Rp77.040 hanya tampil di desktop (fee 7%).",
     "Pulsa Rp79.180 hanya tampil di desktop (fee 7%)."),
    # harga (calcTotals base Rp74.000: QRIS 74.000, GoPay/DANA 74.250, BCA VA 76.500)
    ("// ---- Langkah 4: harga metode dari base Rp72.000 ----",
     "// ---- Langkah 4: harga metode dari base Rp74.000 ----"),
    ('// QRIS Rp72.000, GoPay/DANA Rp72.250 (fee 250), BCA VA Rp74.500',
     '// QRIS Rp74.000, GoPay/DANA Rp74.250 (fee 250), BCA VA Rp76.500'),
    ('await setPriceRight(296, 1026 + DY, "Rp72.000", 357); // QRIS',
     'await setPriceRight(296, 1026 + DY, "Rp74.000", 357); // QRIS'),
    ('await setPriceRight(296, 1080 + DY, "Rp72.250", 357); // GoPay',
     'await setPriceRight(296, 1080 + DY, "Rp74.250", 357); // GoPay'),
    ('await setPriceRight(296, 1134 + DY, "Rp72.250", 357); // DANA',
     'await setPriceRight(296, 1134 + DY, "Rp74.250", 357); // DANA'),
    ('"Virtual Account \\u00b7 BCA Rp74.500 (biaya Rp2.500) \\u00b7 Danamon: lagi perbaikan"',
     '"Virtual Account \\u00b7 BCA Rp76.500 (biaya Rp2.500) \\u00b7 Danamon: lagi perbaikan"'),
    ('await setPriceRight(300, 1804 + DY + extraDY, "Rp72.000", 355); // Harga',
     'await setPriceRight(300, 1804 + DY + extraDY, "Rp74.000", 355); // Harga'),
    ('await setPriceRight(286, 1838 + DY + extraDY, "Rp72.000", 359); // Total',
     'await setPriceRight(286, 1838 + DY + extraDY, "Rp74.000", 359); // Total'),
    ('await setText(summary, "230 Voucher \\u00b7 QRIS");',
     'await setText(summary, "300 Delta Coins \\u00b7 QRIS");'),
]
for old, new in reps:
    if old not in s:
        print("GAGAL: tidak ketemu:", old[:80], file=sys.stderr); sys.exit(1)
    s = s.replace(old, new)

# --- assertion akhir: nol sisa AoV / harga lama ---
for bad in ["Arena of Valor", "arena-of-valor", "Voucher", "Rp72.000", "Rp72.250",
            "Rp74.500", "230 Voucher", "judul AoV", "sub AoV", "warna game arena"]:
    assert bad not in s, "sisa string lama: " + bad
for good in ["Delta Force", "delta-force", "Delta Coins", "300 Delta Coins",
             "Rp74.000", "Rp74.250", "Rp76.500", '"DF"', "#1e3a8a"]:
    assert good in s, "string baru hilang: " + good
open(DST, "w", encoding="utf-8").write(s)
print("OK ->", DST, len(s), "byte")
