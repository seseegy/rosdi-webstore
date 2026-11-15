import { useEffect, useRef, useState } from "react";
import { rp, VOUCHERS, BILL_ADMIN } from "../data-core.js";
import { go, loadOrders } from "../lib.js";
import { useRoving } from "../roving.js";

/* Halaman sukses & cek transaksi berbagi satu chunk (keduanya jarang dibuka
   dari kunjungan pertama dan sama-sama membaca riwayat order lokal). */
// s439 ide 77: lebar konten 640 tadinya literal di dua tempat; s439 ide 79:
// nomor demo "RSD-DEMO1234" tadinya literal di tiga tempat.
// s442 ide 39: order skema lama (field total/base/fee/time/status hilang)
// sebelumnya dirender mentah sebagai "RpNaN", "undefined", "Invalid Date".
// rpSafe + guard di bawah menampilkan "—" untuk field yang hilang; order
// baru (semua field ada) tidak berubah tampilannya.
const rpSafe = (v) => (typeof v === "number" && Number.isFinite(v) ? rp(v) : "—");
const timeSafe = (t) => (t ? new Date(t).toLocaleString("id-ID") : "—");
// s446 ide 78: tanggal baris riwayat sebelumnya memakai toLocaleDateString
// inline — satu helper di samping timeSafe agar hanya ada dua formatter
// tanggal di berkas ini (lengkap + tanggal saja), bukan tiga.
const dateOnly = (t) => (t ? new Date(t).toLocaleDateString("id-ID") : "—");
const PAGE_WIDTH = 640;
const DEMO_REF = "RSD-DEMO1234";
// s448 ide 61: pembersih nomor + pencarian order sebagai fungsi murni di
// luar komponen — dipakai look() dan nilai awal state found, agar deep link
// #/cek/<ref> langsung menampilkan hasil tanpa effect setState (yang
// dilint sebagai set-state-in-effect + exhaustive-deps tak stabil).
const cleanRef = (v) => v.replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "").replace(/[\s]/g, "").toUpperCase();
const findOrder = (r, orders) => {
  if (!r) return undefined;
  if (r === DEMO_REF) return { ref: r, product: "Mobile Legends", item: "172 Diamonds", target: "12345678 (1234)", method: "QRIS", total: 43500, status: "Selesai", time: Date.now() - 86400000 };
  // s440 ide 84: nomor lengkap persis tetap utama; bila tidak ada yang
  // cocok persis, terima satu kecocokan substring yang unik (mis. pengguna
  // hanya ingat sebagian nomor). Dua/lebih kecocokan tetap "tidak ditemukan".
  const exact = orders.find((o) => o.ref === r);
  if (exact) return exact;
  const partial = orders.filter((o) => o.ref.includes(r));
  return partial.length === 1 ? partial[0] : null;
};
// Fase 4 B6 (s455-2/s461-2): salin teks dengan fallback execCommand —
// pola yang sama dengan copyRef/copyToken di SuccessPage di bawah.
const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
  }
};
// Fase 3 B4 (s466-6): ikon centang SVG untuk tombol Salin (ganti glif ✓ teks);
// ChevIcon untuk tombol "Lihat semua" riwayat (s466-5).
const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);
const ChevIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);
export function SuccessPage({ orderRef }) {
  const order = loadOrders().find((o) => o.ref === orderRef);
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const copyRef = async () => {
    try { await navigator.clipboard.writeText(order.ref); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = order.ref; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const copyToken = async () => {
    try { await navigator.clipboard.writeText(order.token.replace(/\s/g, "")); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = order.token.replace(/\s/g, ""); document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };
  // Fase 4 B6 (s466-10): salin kode voucher — pola sama dengan copyToken.
  const copyCode = async () => {
    await copyText(order.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };
  if (!order) return <div className="wrap"><div className="empty">Transaksi tidak ditemukan di perangkat ini. Cek lewat menu Cek Transaksi bila kamu menyimpannya.</div></div>;
  const voucher = order.kind === "voucher" ? VOUCHERS.find((v) => v.name === order.product) : null;
  // Fase 4 B6 (s452-2): admin tagihan — order baru membawa field admin
  // (lihat createOrder); order lama tidak punya, tapi base-nya juga sudah
  // termasuk admin (billItem = amount + BILL_ADMIN), jadi fallback sama.
  const admin = order.admin ?? (order.kind === "tagihan" ? BILL_ADMIN : null);
  return (
    <div className="wrap" style={{ maxWidth: PAGE_WIDTH }}>
      <div className="step success-in" style={{ marginTop: 22, textAlign: "center" }}>
        {/* s437 ide 68: glif ✓ dekoratif disembunyikan dari AT. */}
        <div className="big-check" aria-hidden="true">✓</div>
        <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>Pesanan diterima</h1>
        {/* Fase 4 B6 (s452-10): untuk voucher, kalimat generik "Item sedang
            dikirim ke tujuanmu" bertentangan dengan perilaku baru (kode
            tampil di halaman ini, bukan dikirim) — pakai kalimat sendiri. */}
        <p className="p-sub">{order.kind === "tagihan" ? "Tagihan sudah dibayar. Simpan nomor transaksi sebagai bukti pembayaran." : order.kind === "voucher" ? "Kode voucher tampil di halaman ini — tukarkan mengikuti cara redeem di bawah." : `Status: ${order.status || "—"}. Item sedang dikirim ke tujuanmu — biasanya selesai dalam hitungan detik.`}</p>
        {order.token && (
          <div style={{ textAlign: "left" }}>
            <label className="flabel">Nomor token PLN</label>
            <div className="token-box">{order.token}</div>
            <button className="btn ghost" style={{ width: "100%" }} onClick={copyToken} aria-label="Salin nomor token PLN" aria-live="polite"><span className="copy-in" key={copiedToken ? "y" : "n"}>{copiedToken ? <>{CheckIcon} Token disalin</> : "Salin token"}</span></button>
            <div className="note">Masukkan 20 digit ini ke meteran. Token juga dicatat di riwayat perangkat ini.</div>
          </div>
        )}
        {/* Fase 4 B6 (s466-10): kode voucher tampil di Sukses (dulu hanya
            catatan "dikirim ke email" tanpa kode apa pun) — dengan tombol
            salin, pola sama dengan token PLN di atas. */}
        {order.code && (
          <div style={{ textAlign: "left" }}>
            <label className="flabel">Kode voucher</label>
            <div className="token-box">{order.code}</div>
            <button className="btn ghost" style={{ width: "100%" }} onClick={copyCode} aria-label="Salin kode voucher" aria-live="polite"><span className="copy-in" key={copiedCode ? "y" : "n"}>{copiedCode ? <>{CheckIcon} Kode disalin</> : "Salin kode"}</span></button>
            <div className="note">Kode ini tampil di sini dan di Cek Transaksi — simpan baik-baik sebelum menutup halaman.</div>
          </div>
        )}
        <div style={{ textAlign: "left", marginTop: 14 }}>
          <div className="sum-row"><span>Nomor transaksi</span><span style={{ display: "flex", gap: 8, alignItems: "center" }}><b style={{ whiteSpace: "nowrap" }}>{order.ref}</b><button className="btn ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={copyRef} aria-label="Salin nomor transaksi" aria-live="polite"><span className="copy-in" key={copied ? "y" : "n"}>{copied ? <>{CheckIcon} Disalin</> : "Salin"}</span></button></span></div>
          <div className="sum-row"><span>Waktu</span><b>{timeSafe(order.time)}</b></div>
          {/* s437 ide 58: qty tampil di struk Sukses (kode promo masih antrean — butuh field baru di lib.js yang ikut chunk awal). */}
          <div className="sum-row"><span>Produk</span><b>{order.product} — {order.item}{order.qty > 1 ? ` × ${order.qty}` : ""}</b></div>
          <div className="sum-row"><span>Tujuan</span><b>{order.target}</b></div>
          <div className="sum-row"><span>Pembayaran</span><b>{order.method}</b></div>
          {/* Fase 4 B6 (s452-10): label lama "Bukti dikirim ke" mengklaim
              pengiriman yang belum ada backend-nya — ganti "Email". */}
          {order.email && <div className="sum-row"><span>Email</span><b>{order.email}</b></div>}
          {order.wa && <div className="sum-row"><span>WhatsApp</span><b>{order.wa}</b></div>}
          {/* Fase 4 B6 (s452-2): rincian dipisah jadi 3 baris — tagihan vs
              admin (tagihan), harga vs biaya bayar (semua), diskon bila ada —
              menggantikan satu baris "Harga + biaya". */}
          {admin != null ? (
            <>
              <div className="sum-row"><span>Tagihan</span><b>{rpSafe(order.base - admin)}</b></div>
              <div className="sum-row"><span>Biaya admin</span><b>{rpSafe(admin)}</b></div>
            </>
          ) : (
            <div className="sum-row"><span>Harga</span><b>{rpSafe(order.base)}{order.qty > 1 ? ` (${order.qty} × ${rpSafe(order.base / order.qty)})` : ""}</b></div>
          )}
          <div className="sum-row"><span>Biaya pembayaran</span><b>{rpSafe(order.fee)}</b></div>
          {order.disc ? <div className="sum-row disc"><span>Diskon</span><b>−{rpSafe(order.disc)}</b></div> : null}
          <div className="sum-total"><span>Total</span><b>{rpSafe(order.total)}</b></div>
        </div>
        {/* s444 ide 96: wording garansi disamakan dengan aside Ringkasan. */}
        <div className="note" style={{ textAlign: "left", marginTop: 12 }}>Garansi: item tidak masuk, uang kembali penuh. Simpan nomor transaksi untuk klaim.</div>
        {/* Fase 4 B6 (s452-10): klaim lama "Kode voucher dikirim ke ..." dihapus
            — kode kini tampil di atas, belum ada backend pengiriman. */}
        {voucher && <div className="note" style={{ textAlign: "left", marginTop: 12 }}>{voucher.redeem}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => go("#/cek/" + order.ref)}>Cek Transaksi</button>
          {/* Fase 4 B6 (s454-2): Unduh struk — window.print(); CSS print
              (@media print di index.css, s434 ide 90) sudah menyembunyikan
              header/footer/tombol, jadi yang tercetak hanya struknya. */}
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => window.print()}>Unduh struk</button>
          <button className="btn" style={{ flex: 1 }} onClick={() => go("#/")}>Belanja Lagi</button>
        </div>
      </div>
    </div>
  );
}

export function CekPage() {
  // s445 ide 66: deep link #/cek/RSD-... sebelumnya diabaikan — nomor di path
  // tidak pernah mengisi kolom. Baca dari hash saat mount + saat hash berubah.
  const refFromHash = () => {
    const m = window.location.hash.match(/^#\/cek\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]).replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "").trim().toUpperCase() : "";
  };
  const [ref, setRef] = useState(refFromHash);
  // Fase 4 B6 (s455-2 + s461-2 — satu implementasi untuk keduanya, lihat
  // catatan di bawah pada tombol Salin): salin nomor transaksi hasil Cek.
  const [copiedRef, setCopiedRef] = useState(false);
  const copyFoundRef = async () => {
    if (!found?.ref) return;
    await copyText(found.ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };
  // s448 ide 61: nilai awal found langsung dari hash — deep link #/cek/<ref>
  // menampilkan hasil saat mount, dan refresh mempertahankannya (look()
  // menulis hash). Tanpa effect: tidak ada setState di effect.
  const [found, setFound] = useState(() => findOrder(cleanRef(refFromHash()), loadOrders()));
  const [emptyMsg, setEmptyMsg] = useState(false);
  // Perbaikan deep link (temuan render 14 Nov 2026): CekPage tidak me-remount
  // saat pindah hash dari #/cek ke #/cek/<ref>, dan handler lama hanya mengisi
  // kolom bila kosong tanpa menghitung ulang found — hasil tidak tampil tanpa
  // refresh atau tekan tombol Cek. Handler ini sekarang menyinkronkan kolom
  // DAN hasil ke ref baru dari hash. Effect ini sengaja ditaruh SETELAH
  // deklarasi state di atas, agar tidak membaca setter saat inisialisasi.
  // Aman dari loop: look() menulis hash via replaceState (tidak memicu
  // hashchange), dan handler ini tidak menulis hash. Ketikan pengguna tidak
  // tertimpa oleh ini: mengetik tidak mengubah hash, jadi hashchange hanya
  // terjadi dari navigasi eksplisit (link, back/forward, address bar), yang
  // memang bermaksud menampilkan ref tersebut.
  useEffect(() => {
    const on = () => {
      const h = refFromHash();
      if (!h) return;
      setRef(h);
      setEmptyMsg(false);
      setFound(findOrder(cleanRef(h), loadOrders()));
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const [showAll, setShowAll] = useState(false);
  // s445 ide 76: fokus tadinya tetap di tombol "Cek" saat hasil muncul —
  // pindahkan fokus keyboard ke kartu hasil agar pengguna keyboard/SR
  // langsung berada di hasil, bukan harus Tab melewati seluruh halaman.
  const resultRef = useRef(null);
  useEffect(() => { if (found) resultRef.current?.focus(); }, [found]);
  // s446 ide 92: order dari tab lain sebelumnya baru terlihat setelah
  // refresh — dengarkan storage event agar riwayat ikut berubah tanpa refresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const onStorage = (e) => { if (e.key === "rosdi_orders") setTick((t) => t + 1); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const orders = loadOrders();
  // B2 — roving tabindex riwayat (s456-3): ArrowUp/Down memindah fokus
  // antar baris riwayat; Tab hanya berhenti sekali di daftar ini.
  // Fase 3 B4 (s455-4): baris di luar 5 pertama tetap dirender di dalam
  // .hist-more (collapse grid) agar mengembang/menciut beranimasi; roving
  // dibatasi ke baris terlihat, baris tersembunyi tabIndex -1 + aria-hidden.
  const visibleCount = showAll ? orders.length : 5;
  const histRoving = useRoving(visibleCount, null);
  const firstOrders = orders.slice(0, 5);
  const restOrders = orders.slice(5);
  const rowBtn = (o, i) => (
    <button key={o.ref} type="button" ref={i < visibleCount ? histRoving.setRef(i) : undefined} tabIndex={i < visibleCount ? histRoving.tabIndex(i) : -1} onFocus={histRoving.onFocus(i)} className="sum-row" aria-label={`Lihat transaksi ${o.ref}`} onClick={() => go("#/sukses/" + o.ref)} style={{ width: "100%", border: 0, padding: "5px 0", cursor: "pointer", font: "inherit", textAlign: "left", color: "inherit" }}>
      {/* Fase 4 B6 (s466-8): tujuan (UID + server game / nomor / email)
          tampil di baris riwayat — dulu hanya di detail setelah diklik. */}
      <span>{o.ref}<small style={{ display: "block", color: "var(--faint)" }}>{o.product} — {o.item}{o.qty > 1 ? ` × ${o.qty}` : ""}{o.target ? ` · ${o.target}` : ""} · {o.method || "—"}{o.time ? ` · ${dateOnly(o.time)}` : ""}</small></span>
      <b>{rpSafe(o.total)}{o.disc ? ` · −${rpSafe(o.disc)}` : ""} · {o.status || "—"}</b>
    </button>
  );
  const look = () => {
    // s441 ide 12: zero-width (\u200b dst) bukan \s — buang sebelum dicocokkan.
    // s445 ide 50: spasi di tengah nomor ("RSD- DEMO1234") dibersihkan —
    // nomor transaksi tidak mengandung spasi, seperti UID/Zone/ID PLN.
    const r = cleanRef(ref);
    // s448 ide 61: refresh saat hasil tampil sebelumnya menghilangkan hasil
    // (URL tetap #/cek) — tulis nomor ke hash agar refresh mempertahankannya;
    // replaceState tidak memicu hashchange, jadi tidak ada loop.
    if (r) window.history.replaceState(null, "", "#/cek/" + encodeURIComponent(r));
    // s432 ide 55: input kosong bukan "tidak ditemukan" — minta nomor dulu.
    if (!r) { setFound(undefined); setEmptyMsg(true); return; }
    setEmptyMsg(false);
    setFound(findOrder(r, orders));
  };
  return (
    <div className="wrap" style={{ maxWidth: PAGE_WIDTH }}>
      <div className="crumb"><div><h1>Cek Transaksi</h1><p>Masukkan nomor transaksi dari halaman sukses</p></div></div>
      <div className="step">
        {/* s446 ide 53: Enter di kolom nomor sebelumnya tidak melakukan
            apa-apa (bukan form) — jadikan form agar Enter = klik "Cek". */}
        <form style={{ display: "flex", gap: 10 }} onSubmit={(e) => { e.preventDefault(); look(); }}>
          <input className="input" placeholder="Contoh: RSD-XXXXXX00XXXX" aria-label="Nomor transaksi" value={ref} onChange={(e) => { setRef(e.target.value); setEmptyMsg(false); }} style={{ flex: 1 }} />
          <button className="btn" type="submit">Cek</button>
        </form>
        {emptyMsg && <div className="note bad" aria-live="polite">Masukkan nomor transaksi dulu.</div>}
        {found === null && <div className="note bad" aria-live="polite">Nomor transaksi tidak ditemukan di perangkat ini. Periksa ejaannya — satu huruf atau angka yang salah saja membuat nomor tidak ditemukan. Coba {DEMO_REF} untuk melihat contoh tampilan.</div>}
        {found && (
          <div className="cek-result" ref={resultRef} tabIndex={0} style={{ marginTop: 16 }}>
            {found.ref === DEMO_REF && <div className="note" style={{ marginTop: 0, marginBottom: 8 }}>Ini contoh tampilan — bukan transaksi nyata.</div>}
            {/* s440 ide 85: hasil sebelumnya tidak menulis ulang nomor yang
                dicari — pengguna tidak bisa memastikan ini order yang benar. */}
            {/* Fase 4 B6 (s455-2 + s461-2): SATU tombol Salin untuk kedua
                nomor item — keduanya merujuk fitur yang sama (tombol Salin
                nomor transaksi di kartu hasil Cek; s455-2 dari ide 3, s461-2
                dari A7), jadi diimplementasikan sekali di sini, bukan dua
                tombol ganda. Pola salin sama dengan Sukses (ikon centang
                Fase 3 B4). */}
            <div className="sum-row"><span>Nomor transaksi</span><span style={{ display: "flex", gap: 8, alignItems: "center" }}><b style={{ whiteSpace: "nowrap" }}>{found.ref}</b><button className="btn ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={copyFoundRef} aria-label="Salin nomor transaksi" aria-live="polite"><span className="copy-in" key={copiedRef ? "y" : "n"}>{copiedRef ? <>{CheckIcon} Disalin</> : "Salin"}</span></button></span></div>
            <div className="sum-row"><span>Produk</span><b>{found.product} — {found.item}</b></div>
            <div className="sum-row"><span>Tujuan</span><b>{found.target}</b></div>
            <div className="sum-row"><span>Pembayaran</span><b>{found.method} · {rpSafe(found.total)}</b></div>
            {/* s449 ide 96: token PLN sebelumnya hanya tampil di halaman
                Sukses, padahal catatan di sana mengklaim "Token juga dicatat
                di riwayat perangkat ini" — tampilkan juga di hasil Cek. */}
            {found.token && <div className="sum-row"><span>Nomor token PLN</span><b>{found.token}</b></div>}
            {/* Fase 4 B6 (s466-10): kode voucher juga bisa dilihat lagi di
                sini, sama seperti token PLN — bukan cuma di Sukses. */}
            {found.code && <div className="sum-row"><span>Kode voucher</span><b>{found.code}</b></div>}
            <ul className="timeline">
              <li className="done"><span className="dot" /><span>Pesanan dibuat<small>{timeSafe(found.time)}</small></span></li>
              {/* s459 ide 96: sub-teks tadinya "Metode: QRIS" sementara aside Ringkasan menulis "Pembayaran: QRIS" — samakan labelnya. */}
              <li className="done"><span className="dot" /><span>Pembayaran diterima<small>Pembayaran: {found.method}</small></span></li>
              <li className={found.status === "Selesai" ? "done" : "now"}><span className="dot" /><span>{found.status === "Selesai" ? "Item terkirim" : "Sedang diproses ke pemasok"}<small>{found.status || "—"}</small></span></li>
            </ul>
          </div>
        )}
      </div>
      {/* s444 ide 19/35: riwayat kosong sebelumnya menghilangkan seluruh seksi
          tanpa penjelasan — tampilkan empty-state yang menjelaskan cara melacak. */}
      {orders.length === 0 && (
        <div className="step">
          <div className="step-head"><h2>Transaksi terakhir di perangkat ini</h2></div>
          <div className="note" style={{ marginTop: 0 }}>Belum ada transaksi di perangkat ini. Setelah kamu membeli, ordermu tampil di sini — atau lacak langsung dengan nomor transaksi di atas.</div>
        </div>
      )}
      {orders.length > 0 && (
        <div className="step hist-in" onKeyDown={histRoving.onKeyDown}>
          <div className="step-head"><h2>Transaksi terakhir di perangkat ini</h2></div>
          {/* s441 ide 40: riwayat hanya di perangkat ini — jelaskan tidak ikut pindah ke HP lain. */}
          <div className="note" style={{ marginTop: 0 }}>Riwayat hanya tersimpan di perangkat ini — tidak ikut pindah ke HP lain.</div>
          {/* s440 ide 81+82: baris riwayat tadinya hanya produk + total —
              metode bayar dan tanggal tidak tampil. */}
          {firstOrders.map((o, i) => rowBtn(o, i))}
          {restOrders.length > 0 && (
            <div className={"hist-more" + (showAll ? " open" : "")} aria-hidden={!showAll}>
              <div>{restOrders.map((o, k) => rowBtn(o, 5 + k))}</div>
            </div>
          )}
          {orders.length > 5 && (
            <button className="btn ghost hist-toggle" style={{ width: "100%", marginTop: 8 }} onClick={() => { if (showAll) histRoving.setActive(0); setShowAll(!showAll); }} aria-expanded={showAll}>
              {showAll ? "Tampilkan lebih sedikit" : `Lihat semua (${orders.length} transaksi)`}
              {ChevIcon}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
