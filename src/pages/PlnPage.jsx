import { useState } from "react";
import { maskName, CATEGORY_COLORS } from "../data-core.js";
import { PLN_ITEMS } from "../data-catalog.js";
import CheckoutShell from "./CheckoutShell.jsx";

export default function PlnPage() {
  const [idpel, setIdpel] = useState("");
  const [checked, setChecked] = useState(null);
  // s441 ide 12: zero-width (\u200b dst) bukan \s — buang sebelum validasi.
  // s445 ide 42: titik sebagai pemisah ("5432.1098.7654") dibersihkan seperti
  // spasi/strip — titik bukan karakter valid ID pelanggan.
  const idClean = idpel.replace(/[\s.-]/g, "").replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "");
  // s446 ide 19 (pola yang sama dengan Zone ID): "-" di depan ("-5432…")
  // sebelumnya dibuang seperti pemisah sehingga lolos — tolak mentah-mentah.
  // s452 ide 34: ID semua nol ("000000000000") sebelumnya lolos format —
  // samakan dengan UID/Zone (s448): ID yang semua nol bukan ID yang sah.
  const idOk = /^\d{11,12}$/.test(idClean) && !/^\s*-/.test(idpel) && !/^0+$/.test(idClean);
  const check = () => {
    if (!idOk) return;
    const tarifs = ["R1 / 900 VA", "R1 / 1300 VA", "R2 / 2200 VA", "R1M / 900 VA"];
    let h = 0; for (const c of idClean) h = (h * 31 + c.charCodeAt(0)) % 997;
    setChecked({ name: maskName(idClean), tarif: tarifs[h % tarifs.length] });
  };
  const step1 = (
    <div>
      <label className="flabel" htmlFor="idpel">Nomor Meter / ID Pelanggan</label>
      <div style={{ display: "flex", gap: 10 }}>
        {/* s458 ide 72: Enter di kolom ID sebelumnya tidak melakukan apa-apa — jadikan form agar Enter = klik "Cek Nama" (pola yang sama dengan form Cek, s446 ide 53). */}
        <form onSubmit={(e) => { e.preventDefault(); check(); }} style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
          {/* s461 ide 2: border hijau saat ID PLN lolos Cek Nama — sebelumnya
              input ini tanpa kelas .ok (UID/Zone/Riot sudah punya); .ok hanya
              setelah checked (nama pelanggan tampil), bukan sekadar format sah. */}
          <input id="idpel" className={"input" + (idpel && !idOk ? " err" : checked ? " ok" : "")} inputMode="numeric" placeholder="11–12 digit, tertera di meteran" value={idpel} onChange={(e) => { setIdpel(e.target.value); setChecked(null); }} style={{ flex: 1 }} maxLength={16} aria-required="true" />
          <button className="btn" type="submit" disabled={!idOk}>{checked ? "Cek Ulang" : "Cek Nama"}</button>
        </form>
      </div>
      {idpel && !idOk && <div className="note bad" aria-live="polite">ID pelanggan PLN terdiri dari 11–12 digit angka.</div>}
      {checked && <div className="note good" aria-live="polite">Nama pelanggan: {checked.name} · Tarif: {checked.tarif}. Pastikan nama ini sesuai sebelum membayar — token yang sudah terbit tidak bisa dibatalkan.</div>}
      {!checked && idOk && <div className="note">Klik Cek Nama untuk memastikan ID pelanggan benar sebelum memilih nominal.</div>}
      <div className="note">Nomor token 20 digit tampil di halaman sukses setelah pembayaran — masukkan ke meteran.</div>
    </div>
  );
  // Fase 4 B6 (s452-10): sub lama mengklaim token "dikirim" — belum ada
  // backend pengiriman. Jujurnya: token tampil di halaman sukses.
  return (
    <CheckoutShell
      title="Token PLN" sub="Prabayar · nomor token tampil di halaman sukses setelah pembayaran"
      initials="LN" color={CATEGORY_COLORS.pln}
      step1Title="Masukkan ID Pelanggan" step1Node={step1}
      targetValid={idOk && !!checked} targetText={idOk ? idClean : ""}
      items={PLN_ITEMS} qtyEnabled={false} kind="pln"
    />
  );
}
