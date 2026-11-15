import { useEffect, useRef, useState } from "react";

export default function Header({ theme, setTheme, route }) {
  const [login, setLogin] = useState(false);
  const modalRef = useRef(null);
  useEffect(() => {
    if (!login) return;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === "Escape") setLogin(false); };
    window.addEventListener("keydown", onKey);
    modalRef.current?.focus();
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [login]);
  return (
    <header className="site">
      <div className="wrap header-in">
        <a className="logo" href="#/">
          <span className="logo-mark">R</span>
          <span><span className="logo-name">Rosdi Store</span><small>Top up instan 24 jam</small></span>
        </a>
        <nav className="main" aria-label="Navigasi utama">
          <a href="#/" className={route === "home" ? "on" : ""}>Beranda</a>
          <a href="#/cek" className={route === "cek" ? "on" : ""}>Cek Transaksi</a>
        </nav>
        <div className="header-actions">
          <button className="icon-btn" aria-label="Ganti tema" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
            )}
          </button>
          <button className="btn" onClick={() => setLogin(true)}>Masuk</button>
        </div>
      </div>
      {login && (
        <div className="modal-veil" onClick={() => setLogin(false)}>
          <div className="modal" ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Masuk ke Rosdi Store" onClick={(e) => e.stopPropagation()}>
            <h3>Masuk ke Rosdi Store</h3>
            {/* Fase 4 B6 (s452-10): klaim bukti "dikirim ke email atau
                WhatsApp" dihapus — belum ada backend pengiriman; bukti
                tampil di halaman sukses setelah pembelian. */}
            <p>Sedang disiapkan. Untuk sekarang semua pembelian bisa dilakukan sebagai tamu, tanpa perlu akun — bukti pembayaran tampil di halaman sukses setelah pembelian.</p>
            <button className="btn big" onClick={() => setLogin(false)}>Siap, lanjut belanja</button>
          </div>
        </div>
      )}
    </header>
  );
}
