import { Component, lazy, Suspense, useEffect, useState } from "react";
import { GAMES_META as GAMES, OPERATOR_META as OPERATORS, BILLS_META as BILLS, EWALLETS, VOUCHERS } from "./data-core.js";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";

/* Code-splitting per rute: halaman produk & info baru diunduh saat rutenya
   dibuka, bukan di kunjungan pertama. Beranda + header/footer tetap di chunk
   awal. CheckoutShell ikut terpisah sebagai chunk bersama semua halaman
   produk (diimpor GamePage, PhonePages, PlnPage, VoucherPage). */
const GamePage = lazy(() => import("./pages/GamePage.jsx"));
const PlnPage = lazy(() => import("./pages/PlnPage.jsx"));
const VoucherPage = lazy(() => import("./pages/VoucherPage.jsx"));
const BillIndex = lazy(() => import("./pages/BillPages.jsx").then((m) => ({ default: m.BillIndex })));
const BillPage = lazy(() => import("./pages/BillPages.jsx").then((m) => ({ default: m.BillPage })));
const OperatorIndex = lazy(() => import("./pages/PhonePages.jsx").then((m) => ({ default: m.OperatorIndex })));
const PhonePage = lazy(() => import("./pages/PhonePages.jsx").then((m) => ({ default: m.PhonePage })));
const EmoneyIndex = lazy(() => import("./pages/PhonePages.jsx").then((m) => ({ default: m.EmoneyIndex })));
const SuccessPage = lazy(() => import("./pages/InfoPages.jsx").then((m) => ({ default: m.SuccessPage })));
const CekPage = lazy(() => import("./pages/InfoPages.jsx").then((m) => ({ default: m.CekPage })));

/* B1 — skeleton saat chunk lazy dimuat (Suspense fallback). Sebelumnya hanya
   teks "Memuat halaman…" — audit s467 A1/A3/A4/A5/A7 + s466 A4 mengukur
   0 kartu pada 120 ms lalu konten muncul tiba-tiba. Skeleton ini meniru
   layout halaman produk (crumb + langkah + grid nominal) agar tidak ada
   lompatan kosong. Data lokal sinkron (ganti game/operator) TIDAK memakai
   skeleton — tidak ada loading di sana; delay buatan justru memperlambat. */
function PageLoading() {
  return (
    <div className="wrap" role="status">
      <div className="crumb" aria-hidden="true">
        <span className="skel skel-back" />
        <span className="skel skel-tile" />
        <span className="skel-col">
          <span className="skel skel-line" style={{ width: "55%" }} />
          <span className="skel skel-line" style={{ width: "35%" }} />
        </span>
      </div>
      <div className="skel-step" aria-hidden="true">
        <span className="skel skel-line" style={{ width: "30%" }} />
        <span className="skel skel-input" />
      </div>
      <div className="skel-step" aria-hidden="true">
        <span className="skel skel-line" style={{ width: "30%" }} />
        <div className="nom-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="skel skel-nom" />
          ))}
        </div>
      </div>
      <span className="sr-only">Memuat halaman…</span>
    </div>
  );
}

/* s433 ide 43: chunk lazy yang gagal dimuat (mis. 404) sebelumnya membuat
   aplikasi jatuh ke layar putih kosong — tidak ada yang menangkap error
   Suspense. Boundary ini menampilkan pesan yang bisa dipulihkan. */
class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="empty">Gagal memuat halaman. <button className="btn" onClick={() => location.reload()}>Muat ulang</button></div>;
  }
}

// s433 ide 45: localStorage bisa melempar (dinonaktifkan / mode privat ketat)
// — baca/tulis tema jangan sampai menjatuhkan seluruh aplikasi.
const STATIC_TITLES = { cek: "Cek Transaksi", sukses: "Pesanan Diterima" };

export default function App() {
  const [theme, setTheme] = useState(() => {
    let t = null;
    try { t = localStorage.getItem("rosdi_theme"); } catch { /* abaikan */ }
    return t || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    try { localStorage.setItem("rosdi_theme", theme); } catch { /* tema tidak tersimpan; aplikasi tetap jalan */ }
    // s433 ide 67: bilah browser HP mengikuti tema aktif — warna dibaca dari
    // token --bg (bukan literal) agar check:tokens tetap lulus.
    const bg = getComputedStyle(el).getPropertyValue("--bg").trim();
    if (bg) document.querySelector('meta[name="theme-color"]').content = bg;
  }, [theme]);
  useEffect(() => {
    const on = () => { setHash(window.location.hash); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // Akar s460-6: query menempel di segmen hash ("mobile-legends?tab=xyz")
  // membuat find() gagal lalu jatuh ke Beranda. Buang "?..." sebelum split —
  // parameternya sendiri belum dipakai (prefill s461-8 = Fase 2).
  const parts = hash.replace(/^#\/?/, "").replace(/\?.*$/, "").split("/").filter(Boolean);
  let page = <Home />;
  let route = "home";
  let name = null;
  if (parts[0] === "game") { const g = GAMES.find((x) => x.id === parts[1]); page = g ? <GamePage key={g.id} game={g} /> : <Home />; route = "game"; if (g) name = g.name; }
  else if (parts[0] === "pulsa" || parts[0] === "data") {
    route = parts[0];
    if (!parts[1]) page = <OperatorIndex mode={parts[0]} />;
    else { const op = OPERATORS.find((o) => o.id === parts[1]); page = op ? <PhonePage key={parts.join("/")} mode={parts[0]} op={op} /> : <OperatorIndex mode={parts[0]} />; }
  }
  else if (parts[0] === "pln") { page = <PlnPage />; route = "pln"; }
  else if (parts[0] === "tagihan") {
    route = "tagihan";
    if (!parts[1]) page = <BillIndex />;
    else { const b = BILLS.find((x) => x.id === parts[1]); page = b ? <BillPage key={b.id} bill={b} /> : <BillIndex />; }
  }
  else if (parts[0] === "emoney") {
    route = "emoney";
    if (!parts[1]) page = <EmoneyIndex />;
    else { const w = EWALLETS.find((x) => x.id === parts[1]); page = w ? <PhonePage key={w.id} mode="emoney" wallet={w} /> : <Home />; }
  }
  else if (parts[0] === "voucher") { const v = VOUCHERS.find((x) => x.id === parts[1]); page = v ? <VoucherPage key={v.id} voucher={v} /> : <Home />; route = "voucher"; }
  else if (parts[0] === "cek") { page = <CekPage />; route = "cek"; }
  else if (parts[0] === "sukses") { page = <SuccessPage orderRef={parts[1]} />; route = "sukses"; }

  const t = name || STATIC_TITLES[route];
  // s433 ide 61: judul tab mengikuti halaman (sebelumnya statis di semua rute).
  const title = t ? t + " — Rosdi Store" : "Rosdi Store — Top Up Game, Pulsa, PLN & E-Wallet";
  useEffect(() => { document.title = title; }, [title]);

  return (
    <>
      <a className="skip-link" href="#konten">Lewati ke konten</a>
      <Header theme={theme} setTheme={setTheme} route={route} />
      <main id="konten"><ErrorBoundary key={route}><Suspense fallback={<PageLoading />}>{page}</Suspense></ErrorBoundary></main>
      <Footer />
    </>
  );
}
