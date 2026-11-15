#!/usr/bin/env python3
"""Transform figma-mobile-game-pubg.js -> figma-mobile-game-roblox.js (Roblox).

PUBG adalah template terdekat: 1 tab, 4 item, DELTA 0, tanpa Zone ID/server.
Perbedaan Roblox: tile RB (warna abu #334155 sama seperti PUBG), sub crumb
53 karakter sehingga membungkus 2 baris (lebar dibatasi 220 agar tidak
menabrak "Cek ID" di x=322 dan tetap di atas kartu Langkah 1 y=84 —
di aplikasi nyata pun sub ini membungkus karena kolom teks crumb ~250px).

Run: python3 make-roblox-mobile-builder.py
"""
import re

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-game-pubg.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-game-roblox.js"

with open(SRC, encoding="utf-8") as f:
    s = f.read()

def rep(old, new):
    global s
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    s = s.replace(old, new)

# Header comments: replace whole comment block (lines 1-19) up to the
# "const FRAME_NAME" line.
old_head = s[: s.index('const FRAME_NAME = "__NAME__";')]
new_head = """// Builder frame Figma "Roblox" mobile (390px), diklon dari frame
// Produk Game mobile (1:208 Light / 1:314 Dark) lalu diubah isinya.
// Menutup celah terakhir game mobile: Roblox hanya punya varian desktop
// (95:2/95:241); game mobile lain sudah lengkap (MLBB, Genshin, Free Fire,
// PUBG, Honor of Kings).
// Isi mengikuti src/pages/GamePage.jsx (game roblox, tanpa Zone ID /
// server) + src/data.js (GAMES roblox: SATU tab "Robux", 4 item) +
// CheckoutShell.
// Langkah: 1 User ID (kolom tunggal), 2 Nominal (tab tunggal Robux;
// grid 2 kolom sesuai .nom-grid <=560px), 3 Jumlah,
// 4 Pembayaran (ringkas: QRIS + GoPay + DANA + catatan VA),
// 5 Detail Kontak, 6 Kode Promo, lalu bilah bawah.
// Contoh terpilih: 400 Robux Rp75.000 (Terlaris, sama seperti varian
// desktop), bayar QRIS (tanpa biaya).
// Harga dihitung lewat calcTotals data.js (node -e), bukan tangan:
// QRIS Rp75.000, GoPay/DANA Rp75.250 (fee 250), BCA VA Rp77.500
// (fee 2.500). Grid 2 kolom mengikuti pola Genshin Siklus 5 /
// perbaikan PLN Siklus 29 (bukan 3 kolom 104px frame asal).
// Perbedaan vs builder PUBG: sub crumb 53 karakter
// ("Roblox Corporation · Gift card Robux, kode ke email") membungkus
// 2 baris — lebar dibatasi 220 agar tidak menabrak "Cek ID" (x=322)
// dan tetap di atas kartu Langkah 1 (y=84); di aplikasi nyata sub ini
// juga membungkus karena kolom teks crumb ~250px. Catatan Langkah 3
// memakai teks kode saat ini ("Stok tersedia · maksimal 10 per
// transaksi"), bukan "Stok: tersedia" warisan frame asal (temuan
// Siklus 46).
"""
s = new_head + s[s.index('const FRAME_NAME = "__NAME__";'):]

# Nominal: whole ITEMS block (PUBG 4 items -> Roblox 4 items)
old_items = re.search(r"const ITEMS = \[.*?\n\];", s, re.S).group(0)
new_items = """const ITEMS = [
  { name: "80 Robux", price: "Rp15.500" },
  { name: "400 Robux", price: "Rp75.000", badge: "Terlaris" },
  { name: "800 Robux", price: "Rp149.000" },
  { name: "1700 Robux", price: "Rp299.000" },
];"""
s = s.replace(old_items, new_items)
rep("const SELECTED = 1; // 325 UC Rp72.000",
    "const SELECTED = 1; // 400 Robux Rp75.000")

# Header: tile PB -> RB (warna #334155 sudah sama, dipertahankan)
rep('// ---- header: tile PB abu Level Infinite + judul + sub ----',
    '// ---- header: tile RB abu Roblox Corporation + judul + sub ----')
rep('await setText(tileText, "PB");', 'await setText(tileText, "RB");')
rep('const titleW = await measureW("PUBG Mobile", title.fontSize, title.fontName.style);',
    'const titleW = await measureW("Roblox", title.fontSize, title.fontName.style);')
rep('await setText(title, "PUBG Mobile", Math.ceil(titleW) + 2);',
    'await setText(title, "Roblox", Math.ceil(titleW) + 2);')
rep('const subW = await measureW("Level Infinite · Top up langsung ke akun", sub.fontSize, sub.fontName.style);',
    'const subW = await measureW("Roblox Corporation · Gift card Robux, kode ke email", sub.fontSize, sub.fontName.style);')
rep('await setText(sub, "Level Infinite · Top up langsung ke akun", Math.ceil(subW) + 2);',
    '// Lebar dibatasi 220: sub membungkus 2 baris, tidak menabrak "Cek ID" (x=322)\n// dan tetap di atas kartu Langkah 1 (y=84).\nawait setText(sub, "Roblox Corporation · Gift card Robux, kode ke email", Math.min(Math.ceil(subW) + 2, 220));')

# Langkah 2: tab tunggal UC -> Robux
rep("// ---- langkah 2: tab tunggal UC; hapus 2 tab lama ----",
    "// ---- langkah 2: tab tunggal Robux; hapus 2 tab lama ----")
rep('const ucW = await measureW("UC", tabActiveText.fontSize, tabActiveText.fontName.style);',
    'const ucW = await measureW("Robux", tabActiveText.fontSize, tabActiveText.fontName.style);')
rep('await setText(tabActiveText, "UC", Math.ceil(ucW));',
    'await setText(tabActiveText, "Robux", Math.ceil(ucW));')

# Nama node baru PUBG -> RBX
assert s.count('"PUBG " + p.name') == 1
s = s.replace('"PUBG " + p.name', '"RBX " + p.name')
assert s.count('"PUBGName " + p.name') == 1
s = s.replace('"PUBGName " + p.name', '"RBXName " + p.name')
assert s.count('"PUBGPrice " + p.name') == 1
s = s.replace('"PUBGPrice " + p.name', '"RBXPrice " + p.name')
assert s.count('"PUBGBadge " + p.badge') == 1
s = s.replace('"PUBGBadge " + p.badge', '"RBXBadge " + p.badge')
assert s.count('"PUBGBadgeText " + p.badge') == 1
s = s.replace('"PUBGBadgeText " + p.badge', '"RBXBadgeText " + p.badge')
rep("// ---- sel PUBG baru ----", "// ---- sel Roblox baru ----")

# Langkah 4: harga pembayaran base Rp75.000 (calcTotals via node -e)
rep("// ---- langkah 4: harga pembayaran base Rp72.000 ----",
    "// ---- langkah 4: harga pembayaran base Rp75.000 ----")
rep('await setText(payQRIS, "Rp72.000");', 'await setText(payQRIS, "Rp75.000");')
assert s.count('await setText(payGoPay, "Rp72.250");') == 1
s = s.replace('await setText(payGoPay, "Rp72.250");', 'await setText(payGoPay, "Rp75.250");')
assert s.count('await setText(payDANA, "Rp72.250");') == 1
s = s.replace('await setText(payDANA, "Rp72.250");', 'await setText(payDANA, "Rp75.250");')
rep('await setText(vaNote, "Virtual Account · BCA Rp74.500 (biaya Rp2.500) · Danamon: lagi perbaikan", 326);',
    'await setText(vaNote, "Virtual Account · BCA Rp77.500 (biaya Rp2.500) · Danamon: lagi perbaikan", 326);')

# Bilah bawah
assert s.count('await setText(barHarga, "Rp72.000");') == 1
s = s.replace('await setText(barHarga, "Rp72.000");', 'await setText(barHarga, "Rp75.000");')
assert s.count('await setText(barTotal, "Rp72.000");') == 1
s = s.replace('await setText(barTotal, "Rp72.000");', 'await setText(barTotal, "Rp75.000");')
rep('await setText(summary, "325 UC · QRIS", 170);',
    'await setText(summary, "400 Robux · QRIS", 170);')

with open(DST, "w", encoding="utf-8") as f:
    f.write(s)

# Final sanity checks
# "PUBG" hanya boleh tersisa di 2 baris komentar yang disengaja (daftar game
# + "Perbedaan vs builder PUBG"); bukan di kode/nama/harga.
pubg_lines = [ln for ln in s.splitlines() if "PUBG" in ln]
assert len(pubg_lines) == 2 and all(ln.strip().startswith("//") for ln in pubg_lines), f"PUBG remnants remain: {pubg_lines}"
assert "Level Infinite" not in s, "Level Infinite remnants remain"
assert "Rp72.000" not in s and "Rp72.250" not in s and "Rp74.500" not in s, "old prices remain"
assert "325 UC" not in s and "60 UC" not in s and '"UC"' not in s, "old UC values remain"
assert "Roblox" in s and "400 Robux" in s and "Rp75.000" in s and "Rp77.500" in s, "Roblox values missing"
assert "Math.min(Math.ceil(subW) + 2, 220)" in s, "sub width cap missing"
print("OK: builder written to", DST)
