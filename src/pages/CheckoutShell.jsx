import { useEffect, useRef, useState } from "react";
import { rp, PAYMENTS, ALL_PAYMENTS, PROMOS, calcTotals, BILL_ADMIN } from "../data-core.js";
import { go, saveOrder, createOrder, phoneOk, getContact, setContact } from "../lib.js";
import { useRoving } from "../roving.js";

// s433 ide 87: batas jumlah per transaksi sebagai konstanta bernama.
const MAX_QTY = 10;

/* Checkout shell: langkah 2 s.d. terakhir + ringkasan.
   Dipakai semua halaman produk (game, pulsa, data, PLN, e-wallet, voucher)
   sehingga Rollup menaruhnya di satu chunk bersama yang diunduh sekali saat
   halaman produk pertama dibuka. */
export default function CheckoutShell({ title, sub, initials, color, step1Node, step1Title, targetValid, targetText, tabs, items, qtyEnabled, kind, step2Title = "Pilih Nominal", itemLabel = "nominal", destOpName }) {
  const tabNames = tabs ? Object.keys(tabs) : null;
  const [tab, setTab] = useState(tabNames ? tabNames[0] : null);
  const [itemIdx, setItemIdx] = useState(null);
  const [qty, setQtyState] = useState(1);
  // Fase 4 B6 (s461-3): qty bisa diketik — qtyText menampung ketikan
  // sementara (termasuk kosong saat menghapus), dikomit saat blur/Enter.
  const [qtyText, setQtyText] = useState("1");
  const setQty = (v) => { const n = Math.min(MAX_QTY, Math.max(1, v)); setQtyState(n); setQtyText(String(n)); };
  const commitQtyText = () => {
    const n = parseInt(qtyText.replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) setQty(n); else setQtyText(String(qty));
  };
  const [payId, setPayId] = useState(null);
  // Fase 4 B6 (s466-7): email/WA dibaca dari state bersama saat mount dan
  // ditulis balik tiap ketikan — pindah halaman dalam satu sesi tidak
  // mengosongkan kontak yang sudah diisi.
  const [email, setEmailState] = useState(() => getContact().email);
  const [wa, setWaState] = useState(() => getContact().wa);
  const setEmail = (v) => { setEmailState(v); setContact({ email: v }); };
  const setWa = (v) => { setWaState(v); setContact({ wa: v }); };
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState(null);
  const [promoMsg, setPromoMsg] = useState(null);
  // Fase 3 B4 (s455-5): key berubah tiap applyPromo agar animasi shake catatan promo diputar ulang walau pesannya sama.
  const [promoTick, setPromoTick] = useState(0);
  const [buying, setBuying] = useState(false);
  // Fase 3 B4 (s457-1 + s460-1): feedback "mentok" stepper — tombol di batas
  // memakai aria-disabled (bukan disabled) agar klik tetap memicu goyangan.
  const [qtyNudge, setQtyNudge] = useState(false);
  const nudgeTimer = useRef(null);
  const nudgeQty = (dir) => {
    if ((dir < 0 && qty <= 1) || (dir > 0 && qty >= MAX_QTY)) {
      setQtyNudge(false);
      requestAnimationFrame(() => setQtyNudge(true));
      clearTimeout(nudgeTimer.current);
      nudgeTimer.current = setTimeout(() => setQtyNudge(false), 450);
      return;
    }
    setQty(Math.min(MAX_QTY, Math.max(1, qty + dir)));
  };
  // s435 ide 65: guard `buying` (state) kalah dari dua klik sinkron dalam
  // satu task yang sama — handler kedua jalan sebelum re-render, jadi dua
  // order tersimpan (probe CDP 390: before 0 → after 2). Ref berubah
  // sinkron di handler, jadi klik kedua dalam task yang sama tertahan.
  const buyingRef = useRef(false);

  const list = tabs ? tabs[tab] : items;
  const item = itemIdx != null ? list[itemIdx] : null;
  const pay = ALL_PAYMENTS.find((p) => p.id === payId) || null;
  // B2 — roving tabindex (s465-7, s467-1):
  // - tab game: panah kiri/kanan + Home/End, seleksi mengikuti fokus;
  // - grid nominal: panah 4 arah (kolom dihitung dari computed style) +
  //   Home/End, fokus saja (aktivasi via Enter/Space);
  // - daftar metode bayar: ArrowUp/Down lintas grup, lewati yang nonaktif.
  const nomRoving = useRoving(list.length, null, itemIdx ?? 0);
  // Ganti tab mereset pilihan nominal → pemberhentian Tab kembali ke pertama.
  const switchTab = (t) => { if (tab !== t) { setTab(t); setItemIdx(null); nomRoving.setActive(0); setNomSettled(false); } };
  // Fase 3 B4 (s455-1): stagger kartu nominal — matikan animasi entrance
  // ~1 detik setelah mount/ganti tab agar hover lift + pop pilihan bekerja
  // (fill both menahan transform; ganti pilihan tidak memutar ulang entrance).
  // Reset di handler switchTab (event), bukan di effect, agar lint
  // set-state-in-effect tidak berbunyi; effect hanya menjalankan timer.
  const [nomSettled, setNomSettled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setNomSettled(true), 1050); return () => clearTimeout(t); }, [tab]);
  const tabsRoving = useRoving(tabNames ? tabNames.length : 0, tabNames ? (i) => switchTab(tabNames[i]) : null);
  const flatPays = PAYMENTS.flatMap((g) => g.items);
  const payIdx = new Map(flatPays.map((p, i) => [p.id, i]));
  const payRoving = useRoving(flatPays.length, null, Math.max(0, flatPays.findIndex((p) => p.id === payId)));
  const onNomKeyDown = (e) => {
    const cols = getComputedStyle(e.currentTarget).gridTemplateColumns.split(" ").length || 3;
    nomRoving.onKeyDown(e, cols);
  };
  // s449 ide 60: operator metode bayar pulsa vs operator nomor tujuan —
  // id bayar ("pulsa-tsel") tidak sama polanya dengan id operator
  // ("telkomsel"), jadi bandingkan lewat nama ("Pulsa Telkomsel" -> "Telkomsel").
  const payOpName = pay && pay.id.startsWith("pulsa-") ? pay.name.replace("Pulsa ", "") : null;
  const sameOp = !payOpName || !destOpName || payOpName === destOpName;
  const base = item ? item.price * qty : 0;
  // Satu rumus untuk ringkasan dan harga tiap metode — lihat calcTotals di data.js.
  const { fee, disc, total } = calcTotals(base, item ? pay : null, item ? promo : null);
  const canBuy = targetValid && item && pay && !pay.status;

  // s445 ide 46 + 32: kontak opsional sebelumnya tanpa validasi — WA 8 digit
  // atau email tanpa TLD tersimpan diam-diam dan bukti tidak terkirim.
  // Peringatan saja (tidak memblokir Beli): field boleh dikosongkan.
  // Normalisasi WA mengikuti PhonePages.jsx (+62 → 0, buang spasi/strip).
  // s447 ide 43: "62" tanpa "+" dinormalisasi juga ke 0 — sebelumnya hanya
  // "+62" yang diubah, "62812…" malah memunculkan peringatan format salah.
  const waClean = wa.replace(/[\s-]/g, "").replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "").replace(/^\+?62/, "0");
  const waWarn = wa.trim() !== "" && !phoneOk(waClean);
  // Regex email sama dengan VoucherPage.jsx (termasuk tolak titik ganda s445
  // ide 33 dan titik di awal/ujung local-part s446 ide 15) — diduplikasi
  // karena lib.js/data.js tidak boleh diubah (chunk awal).
  // s454 ide 44: batas panjang RFC 5321 (local-part maks 64, total maks 254)
  // — regex format saja tidak membatasi panjang.
  // s455 ide 41/42: label domain harus RFC 1035 (huruf/angka, boleh strip
  // di tengah, tidak boleh diawali/diakhiri strip; tanpa underscore) —
  // "nama@mail_com.com" dan "nama@-mail.com" sebelumnya lolos.
  const emailTrim = email.replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "").trim();
  // s457 ide 37: TLD hanya huruf (IANA) — "nama@mail.c0m" sebelumnya lolos.
  // s465-6: label domain maks 63 karakter (RFC 1035) — "nama@<64 huruf>.com"
  // sebelumnya lolos; tengah label {0,61} + TLD {2,63}.
  const emailWarn = email.trim() !== "" && (!/^(?!\.)(?!.*\.\.)(?!.*\.@)(?!.*@\.)[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(emailTrim) || emailTrim.length > 254 || emailTrim.split("@")[0].length > 64);

  const applyPromo = () => {
    setPromoTick((t) => t + 1);
    // s441 ide 12: zero-width (\u200b dst) bukan \s — buang sebelum dicocokkan.
    const code = promoInput.replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "").trim().toUpperCase();
    if (PROMOS[code]) { setPromo({ code, ...PROMOS[code] }); setPromoMsg({ ok: true, text: `Kode ${code} aktif: ${PROMOS[code].desc}.` }); }
    else { setPromo(null); setPromoMsg({ ok: false, text: `Kode ${code} tidak dikenal. Coba ROSDI10 atau GAMER5.` }); }
  };

  const buy = () => {
    // Penjaga double-tap: tanpa ini dua ketukan cepat sebelum navigasi
    // membuat dua order tersimpan (dua ref berbeda, dua baris riwayat).
    if (buyingRef.current) return;
    buyingRef.current = true;
    setBuying(true);
    // Fase 4 B6 (s452-2): tagihan membawa biaya admin terpisah agar Sukses
    // bisa merinci tagihan vs admin (base sudah termasuk admin).
    const order = createOrder({ kind, title, item, qty, target: targetText, base, fee, disc, total, method: pay.name, email, wa, admin: kind === "tagihan" ? BILL_ADMIN : null });
    saveOrder(order);
    go("#/sukses/" + order.ref);
  };

  const steps = [];
  steps.push(
    <div className="step" key="s1">
      <div className="step-head"><span className="step-num">1</span><h2>{step1Title}</h2></div>
      {step1Node}
    </div>
  );
  steps.push(
    <div className="step" key="s2">
      <div className="step-head"><span className="step-num">2</span><h2>{step2Title}</h2></div>
      {tabNames && (
        <div className="tabs" onKeyDown={tabsRoving.onKeyDown}>
          {tabNames.map((t, i) => (
            <button key={t} ref={tabsRoving.setRef(i)} tabIndex={tabsRoving.tabIndex(i)} onFocus={tabsRoving.onFocus(i)} className={"tab" + (tab === t ? " on" : "")} aria-pressed={tab === t} onClick={() => switchTab(t)}>{t}</button>
          ))}
        </div>
      )}
      <div className={"nom-grid" + (nomSettled ? " settled" : "")} onKeyDown={onNomKeyDown}>
        {list.length === 0 && <div className="empty">Belum ada {itemLabel} yang tersedia di sini.</div>}
        {list.map((it, i) => (
          <button key={it.name} ref={nomRoving.setRef(i)} tabIndex={nomRoving.tabIndex(i)} onFocus={nomRoving.onFocus(i)} className={"nom" + (itemIdx === i ? " on" : "")} aria-pressed={itemIdx === i} onClick={() => setItemIdx(i)} style={{ "--i": i }}>
            <span className="n-name">{it.name}</span>
            {it.meta && <span className="n-meta">{it.meta}</span>}
            <span className="n-price">{rp(it.price)} {it.was && <span className="was" title={`Harga normal ${rp(it.was)}`}><span className="sr-only">harga lama </span>{rp(it.was)}</span>}</span>
            {/* s442 ide 79: badge tadinya anak pertama kartu sehingga SR
                membacakan "-5%"/"Terlaris" SEBELUM nama item; badge absolute
                (top/right) jadi urutan DOM tidak mengubah tampilan — pindah
                ke akhir agar SR membaca nama → meta → harga → badge. */}
            {it.badge && <span className="badge">{it.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
  if (qtyEnabled) {
    steps.push(
      <div className="step" key="sq">
        <div className="step-head"><span className="step-num">3</span><h2>Jumlah Pembelian</h2></div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className={"qty" + (qtyNudge ? " nudge" : "")} role="group" aria-label="Jumlah pembelian">
            <button type="button" onClick={() => nudgeQty(-1)} aria-disabled={qty <= 1} aria-label="Kurangi">−</button>
            {/* Fase 4 B6 (s461-3): angka qty bisa diketik langsung (1–10);
                dikomit saat blur/Enter, di luar rentang dijepit, kosong
                kembali ke nilai terakhir. Stepper tetap jalan seperti dulu. */}
            <input className="qty-input" type="text" inputMode="numeric" autoComplete="off" aria-label="Jumlah pembelian, ketik angka 1 sampai 10" value={qtyText} onChange={(e) => setQtyText(e.target.value)} onBlur={commitQtyText} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitQtyText(); e.currentTarget.blur(); } }} />
            <button type="button" className="plus" onClick={() => nudgeQty(1)} aria-disabled={qty >= MAX_QTY} aria-label="Tambah">+</button>
          </div>
          <span className="note" style={{ marginTop: 0 }}>Stok tersedia · maksimal {MAX_QTY} per transaksi</span>
        </div>
      </div>
    );
  }
  const nPay = steps.length + 1;
  steps.push(
    <div className="step" key="sp" onKeyDown={payRoving.onKeyDown}>
      <div className="step-head"><span className="step-num">{nPay}</span><h2>Pilih Pembayaran</h2></div>
      {!item && <div className="note" style={{ marginTop: 0 }}>Pilih {itemLabel} dulu — harga tiap metode akan tampil di sini, sudah termasuk biayanya.</div>}
      {item && PAYMENTS.map((g) => (
        <div key={g.group}>
          <div className="pay-group">{g.group}</div>
          {g.items.map((p) => {
            // Harga baris ini memakai rumus yang sama dengan ringkasan,
            // jadi total yang tampil di sini selalu sama dengan Total.
            const t = calcTotals(base, p, promo);
            const pi = payIdx.get(p.id);
            return (
              <button key={p.id} ref={payRoving.setRef(pi)} tabIndex={payRoving.tabIndex(pi)} onFocus={payRoving.onFocus(pi)} className={"pay" + (payId === p.id ? " on" : "")} aria-pressed={payId === p.id} disabled={!!p.status} onClick={() => setPayId(p.id)}>
                <span className="pm">{p.mark}</span>
                <span><span className="p-name2">{p.name}</span><span className="p-desc">{p.desc}</span></span>
                {p.status
                  ? <span className="status-tag" style={{ marginLeft: "auto" }}>{p.status}</span>
                  : <span className="p-price">{rp(t.total)}<span className="p-fee">{(t.fee === 0 ? "tanpa biaya" : "biaya " + rp(t.fee)) + (disc > 0 ? " · promo −" + rp(disc) : "")}</span></span>}
              </button>
            );
          })}
        </div>
      ))}
      {/* s434 ide 44: beli pulsa dibayar dengan pulsa — potongannya dari nomor
          tujuan yang sama, jadi peringatkan agar pulsanya cukup. */}
      {kind === "pulsa" && pay && payOpName && (
        <div className="note" style={{ marginTop: 8 }}>
          {sameOp
            ? "Kamu membayar pulsa dengan pulsa — biayanya dipotong dari pulsa nomor tujuan ini, jadi pastikan pulsanya cukup."
            : `Kamu membayar dengan pulsa ${payOpName} — biayanya dipotong dari pulsa nomor ${payOpName} yang membayar, bukan dari nomor tujuan ${destOpName} ini. Pastikan pulsanya cukup.`}
        </div>
      )}
      {/* s444 ide 29: biaya pembayaran lebih besar dari harga item (mis.
          item Rp1.000 + BCA VA Rp2.500) — sarankan metode tanpa biaya.
          s445 ide 54: ambang diperluas ke fee >= 25% dari harga item —
          e-wallet Rp250 pada item Rp1.000 (25%) sebelumnya diam tanpa
          penjelasan proporsi, padahal fee 7% pulsa tidak pernah sampai sini. */}
      {item && pay && fee > 0 && fee * 4 >= base && (
        <div className="note" style={{ marginTop: 8 }}>
          {fee > base
            ? `Biaya pembayaran (${rp(fee)}) lebih besar dari harga item (${rp(base)}) — coba QRIS yang tanpa biaya.`
            : `Biaya pembayaran (${rp(fee)}) adalah ${Math.round((fee / base) * 100)}% dari harga item (${rp(base)}) — coba QRIS yang tanpa biaya.`}
        </div>
      )}
    </div>
  );
  steps.push(
    <div className="step" key="sc">
      <div className="step-head"><span className="step-num">{nPay + 1}</span><h2>Detail Kontak</h2></div>
      <div className="row2 eq">
        <div>
          <label className="flabel" htmlFor="email">Email (opsional)</label>
          {/* s460 ide 2: border hijau saat email valid — sebelumnya input ini
              satu-satunya tanpa kelas .ok (UID/Zone/Riot sudah punya). */}
          <input id="email" className={"input" + (email.trim() !== "" && !emailWarn ? " ok" : "")} type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="flabel" htmlFor="wa">WhatsApp (opsional)</label>
          {/* s458 ide 73: Enter di kolom WA sebelumnya tidak melakukan apa-apa — pindahkan fokus ke kolom Kode Promo (langkah berikutnya). */}
          {/* Fase 4 B6 (s461-4): border hijau saat WA valid — pola yang sama
              dengan email di atas (s460 ide 2) dan HP di PhonePages (s461-1):
              .ok hanya saat ada isi dan sah; transisi 0.15s dari .input. */}
          <input id="wa" className={"input" + (wa.trim() !== "" && !waWarn ? " ok" : "")} inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" value={wa} onChange={(e) => setWa(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.querySelector('input[aria-label="Kode promo"]')?.focus(); } }} />
        </div>
      </div>
      {/* Fase 4 B6 (s452-10): teks lama mengklaim bukti "dikirim ke kontak
          ini" — belum ada backend pengiriman. Jujurnya: bukti tampil di
          halaman sukses; kontak ini dicatat sebagai tujuan bukti. */}
      <div className="note">Bukti pembayaran dan status pesanan tampil di halaman sukses setelah pembelian. Kontak ini dicatat sebagai tujuan bukti. Boleh dikosongkan — hasil transaksi tetap tampil di halaman sukses.</div>
      {emailWarn && <div className="note warn" style={{ marginTop: 8 }} aria-live="polite">Format email sepertinya belum benar — bukti tidak akan terkirim ke email ini.</div>}
      {waWarn && <div className="note warn" style={{ marginTop: 8 }} aria-live="polite">Nomor WhatsApp sepertinya belum benar (awalan 08, 10–13 digit) — bukti tidak akan terkirim ke nomor ini.</div>}
    </div>
  );
  steps.push(
    <div className="step" key="spr">
      <div className="step-head"><span className="step-num">{nPay + 2}</span><h2>Kode Promo</h2></div>
      <form onSubmit={(e) => { e.preventDefault(); applyPromo(); }}>
        <div style={{ display: "flex", gap: 10 }}>
          {/* s460 ide 10: border hijau saat promo aktif — sebelumnya hanya
              pesan .note.good, inputnya sendiri tidak berubah. */}
          <input className={"input" + (promo ? " ok" : "")} placeholder="Punya kode promo? Coba ROSDI10 / GAMER5" aria-label="Kode promo" maxLength={20} value={promoInput} onChange={(e) => setPromoInput(e.target.value)} style={{ flex: 1 }} />
          <button className="btn promo-btn" type="submit" disabled={!promoInput.trim()}>Pakai</button>
          {/* s439 ide 41: tombol "Pakai" tadinya tidak berubah setelah promo
              aktif — pengguna tak bisa membatalkan promo tanpa mengetik kode
              salah. Tampilkan "Hapus" saat ada promo aktif. */}
          {promo && <button className="btn ghost promo-btn" type="button" onClick={() => { setPromo(null); setPromoInput(""); setPromoMsg(null); }}>Hapus</button>}
        </div>
      </form>
      {promoMsg && <div key={promoTick} className={"note " + (promoMsg.ok ? "good" : "bad") + (!promoMsg.ok ? " shake" : "")} aria-live="polite">{promoMsg.text}</div>}
    </div>
  );

  return (
    <div className="wrap">
      <div className="crumb">
        <button className="back" onClick={() => go("#/")} aria-label="Kembali">‹</button>
        <span className="tile" style={{ background: color, width: 42, height: 42 }}>{initials}</span>
        <div><h1>{title}</h1><p>{sub}</p></div>
      </div>
      <div className="flow">
        <div>{steps}</div>
        <aside>
          <div className="summary">
            <h2>Ringkasan</h2>
            <div className="sum-row"><span>Produk</span><b>{title}</b></div>
            <div className="sum-row"><span>Item</span><b>{item ? `${item.name}${qtyEnabled && qty > 1 ? " × " + qty : ""}` : "Belum dipilih"}</b></div>
            <div className="sum-row"><span>Tujuan</span><b>{targetText || "Belum diisi"}</b></div>
            {/* Fase 4 B6 (s466-9): email tampil di aside agar bisa diperiksa
                sebelum membeli — hanya saat terisi, seperti baris "Email" di
                Sukses. WA tidak ditambah: item ini hanya soal email. */}
            {emailTrim && <div className="sum-row"><span>Email</span><b>{emailTrim}</b></div>}
            <div className="sum-row"><span>Pembayaran</span><b>{pay ? pay.name : "Belum dipilih"}</b></div>
            {/* s437 ide 26: harga satuan saat qty>1 — sebelumnya hanya total. */}
            <div className="sum-row"><span>Harga</span><b>{item ? rp(base) : "—"}{item && qtyEnabled && qty > 1 ? ` (${qty} × ${rp(item.price)})` : ""}{item && item.was ? <span className="was" title={`Harga normal ${rp(item.was * qty)}`}> <span className="sr-only">harga lama </span>{rp(item.was * qty)}</span> : null}</b></div>
            <div className="sum-row"><span>Biaya pembayaran</span><b>{item && pay ? rp(fee) : "—"}</b></div>
            {disc > 0 && <div className="sum-row disc"><span>Diskon {promo.code}</span><b>−{rp(disc)}</b></div>}
            <div className="sum-total" aria-live="polite"><span>Total</span><b key={total}>{item ? rp(total) : "Rp0"}</b></div>
            <div className="note">Total ini sama persis dengan harga pada metode pembayaran yang kamu pilih. Tidak ada biaya tambahan setelah ini.</div>
            {/* s446 ide 39: peringatan token tak bisa dibatalkan sebelumnya
                hanya ada di Langkah 1 PLN — tampilkan juga di ringkasan,
                tepat sebelum tombol Beli. */}
            {kind === "pln" && <div className="note" style={{ marginTop: 10 }}>Token yang sudah terbit tidak bisa dibatalkan — pastikan ID pelanggan benar sebelum membayar.</div>}
            <button className="btn big" style={{ marginTop: 14 }} disabled={!canBuy || buying} onClick={buy}>Beli Sekarang</button>
            {/* s434 ide 32: tombol Beli yang nonaktif sebelumnya diam tanpa
                penjelasan — sebutkan syarat yang belum lengkap. */}
            {!canBuy && (
              <div className="note" style={{ marginTop: 10 }}>
                {pay && pay.status
                  ? "Metode yang dipilih sedang perbaikan — pilih metode pembayaran lain."
                  : "Untuk membeli, lengkapi dulu: " + [
                      !targetValid ? "data tujuan" : null,
                      !item ? itemLabel : null,
                      !pay ? "metode pembayaran" : null,
                    ].filter(Boolean).join(", ") + "."}
              </div>
            )}
            {/* s437 ide 68: glif ✓ dekoratif disembunyikan dari AT. */}
            <div className="guarantee"><span aria-hidden="true">✓</span><span>Garansi: item tidak masuk, uang kembali penuh. Simpan nomor transaksi untuk klaim.</span></div>
          </div>
        </aside>
      </div>
      <div className="mobile-bar">
        {/* s458 ide 99: mobile-bar tadinya hanya menampilkan nama item tanpa jumlah — samakan dengan aside ("172 Diamonds × 2"). */}
        <div className="mb-total" aria-live="polite"><span>{item ? `${item.name}${qtyEnabled && qty > 1 ? " × " + qty : ""}` : "Pilih " + itemLabel + " dulu"}</span><b key={total}>{item ? rp(total) : "Rp0"}</b></div> {/* s462 ide 7: key={total} → angka beranimasi tiap berubah */}
        <button className="btn" disabled={!canBuy || buying} onClick={buy}>Beli Sekarang</button>
      </div>
    </div>
  );
}
