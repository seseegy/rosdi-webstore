// Probe Figma s456 ide 61-70 (read-only).
const F = (id) => figma.getNodeById(id);
const texts = (frame) => (frame ? frame.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters) : null);
const out = {};
// Re-discovery: semua frame tingkat atas + cari nama XL/Tri/GoPay/OVO Desktop.
const all = figma.currentPage.children.filter((n) => n.type === "FRAME").map((f) => [f.id, f.name]);
out.frameCount = all.length;
out.framesXL_Tri_GoPay_OVO = all.filter(([, n]) => /XL|Tri|GoPay|OVO/i.test(n)).map(([id, n]) => id + " | " + n);
out.framesPulsaDesktop = all.filter(([, n]) => /Pulsa.*Desktop/i.test(n)).map(([id, n]) => id + " | " + n);
out.framesEWalletDesktop = all.filter(([, n]) => /E-Wallet.*Desktop|Saldo.*Desktop/i.test(n)).map(([id, n]) => id + " | " + n);
// 61-63: hitung kartu nominal di frame Desktop game.
out.i61_cod = texts(F("283:2")).filter((t) => /CP$/.test(t.trim()));
out.i62_wr = texts(F("285:2")).filter((t) => /Wild Cores$/.test(t.trim()));
out.i63_df = texts(F("287:2")).filter((t) => /Delta Coins$/.test(t.trim()));
// 64-65: konteks — Pulsa Telkomsel Desktop 28:2 (pembanding, sudah diaudit s454).
out.i64_65_tselDesktop = texts(F("28:2")).filter((t) => /^Pulsa /.test(t.trim()));
// 66-67: konteks — E-Wallet mobile 3:2 (daftar saldo bersama) + Indeks E-Wallet Desktop 51:190.
out.i66_67_ewalletMobile = texts(F("3:2")).filter((t) => /^Saldo \d/.test(t.trim()));
out.i66_67_ewalletDesktopIdx = texts(F("51:190")).filter((t) => /^(Saldo DANA|Saldo GoPay|Saldo OVO|Saldo ShopeePay)$/.test(t.trim()));
// 68-69: hitung kartu voucher Desktop.
out.i68_psn = texts(F("105:162")).filter((t) => /PSN IDR/.test(t));
out.i69_steam = texts(F("100:232")).filter((t) => /^Steam Wallet \d/.test(t.trim()));
// 70: isi modal S&K Dark (mobile 10:105 + Desktop 170:247) — teks lengkap.
out.i70_skDarkMobile = texts(F("10:105"));
out.i70_skDarkDesktop = texts(F("170:247"));
return out;
