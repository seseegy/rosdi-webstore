import { useEffect, useRef, useState } from "react";
import { go } from "../lib.js";

export default function Footer() {
  const [doc, setDoc] = useState(null);
  const modalRef = useRef(null);
  useEffect(() => {
    if (!doc) return;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === "Escape") setDoc(null); };
    window.addEventListener("keydown", onKey);
    modalRef.current?.focus();
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [doc]);
  const DOCS = {
    sk: { title: "Syarat & Ketentuan", body: "Semua pesanan diproses otomatis setelah pembayaran terkonfirmasi. Pembeli wajib memeriksa User ID, nomor HP, ID pelanggan, dan nomor tagihan sebelum membayar — kesalahan penulisan tujuan di luar tanggung jawab Rosdi Store dan pesanan yang sudah terproses tidak dapat dibatalkan. Harga mengikuti katalog pemasok dan dapat berubah sewaktu-waktu; harga yang berlaku adalah harga saat pesanan dibuat." },
    refund: { title: "Kebijakan Pengembalian", body: "Pesanan yang gagal terproses (stok kosong, gangguan pemasok, atau item tidak terkirim) dikembalikan penuh ke metode pembayaran asal, maksimal 1x24 jam sejak status gagal tercatat. Token PLN dan kode voucher yang sudah terbit tidak dapat dibatalkan. Untuk klaim, buka Cek Transaksi dan siapkan nomor transaksimu." },
  };
  const toCara = () => { go("#/"); setTimeout(() => document.getElementById("cara-topup")?.scrollIntoView({ behavior: "smooth" }), 120); };
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot-in">
          <div>
            <a className="logo" href="#/" style={{ marginBottom: 10 }}>
              <span className="logo-mark">R</span><span>Rosdi Store</span>
            </a>
            <p>Toko top up game, pulsa, paket data, token PLN, tagihan pascabayar, dan e-wallet dengan harga yang ditampilkan apa adanya sejak awal — termasuk biaya tiap metode pembayaran.</p>
          </div>
          <div>
            <h2>Produk</h2>
            <a href="#/game/mobile-legends">Mobile Legends</a>
            <a href="#/game/free-fire">Free Fire</a>
            <a href="#/pulsa">Pulsa Reguler</a>
            <a href="#/pln">Token PLN</a>
            <a href="#/tagihan">Tagihan Pascabayar</a>
          </div>
          <div>
            <h2>Bantuan</h2>
            <a href="#/cek">Cek Transaksi</a>
            <a className="flink" href="#/" onClick={toCara}>Cara Top Up</a>
            <button className="flink" onClick={() => setDoc("sk")}>Syarat & Ketentuan</button>
            <button className="flink" onClick={() => setDoc("refund")}>Kebijakan Pengembalian</button>
          </div>
          <div>
            <h2>Pembayaran</h2>
            <div className="pay-chips">
              {["QRIS","GoPay","DANA","OVO","ShopeePay","BCA","Mandiri","BRI","Alfamart","Indomaret","Pulsa"].map((p) => <span key={p}>{p}</span>)}
            </div>
          </div>
        </div>
        {doc && (
          <div className="modal-veil" onClick={() => setDoc(null)}>
            <div className="modal" ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={DOCS[doc].title} onClick={(e) => e.stopPropagation()}>
              <h3>{DOCS[doc].title}</h3>
              <p>{DOCS[doc].body}</p>
              <button className="btn big" onClick={() => setDoc(null)}>Tutup</button>
            </div>
          </div>
        )}
        <div className="copyright">
          <span>© 2026 Rosdi Store</span>
          <span>Harga diperbarui mengikuti katalog pemasok dan dapat berubah sewaktu-waktu.</span>
        </div>
      </div>
    </footer>
  );
}
