import { useState } from "react";
import { rp, BILL_ADMIN, maskName } from "../data-core.js";
import { BILLS, billItem } from "../data-catalog.js";
import { go } from "../lib.js";
import CheckoutShell from "./CheckoutShell.jsx";

/* Rute tagihan pascabayar berbagi satu chunk: BillIndex + BillPage memakai
   CheckoutShell yang sama dengan halaman produk lain (Tahap 4). Alur
   mengikuti pola Token PLN (PlnPage.jsx): input nomor → Cek Tagihan →
   rincian contoh → pilih tagihan → pembayaran → sukses. */
export function BillIndex() {
  return (
    <div className="wrap">
      <div className="crumb">
        <button className="back" onClick={() => go("#/")} aria-label="Kembali">‹</button>
        <div><h1>Tagihan Pascabayar</h1><p>Cek & bayar tagihan bulanan — pilih kategori</p></div>
      </div>
      <div className="grid c3">
        {BILLS.map((b) => (
          <a key={b.id} className="card" href={`#/tagihan/${b.id}`}>
            <span className="tile" style={{ background: b.color }}>{b.initials}</span>
            <div className="p-name">{b.name}</div>
            <div className="p-sub">{b.sub}</div>
            <div className="p-from">Dari {rp(billItem(b).price)}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function BillPage({ bill: billMeta }) {
  // App hanya membawa META tagihan; lengkapi ke data penuh dari katalog.
  const bill = BILLS.find((x) => x.id === billMeta.id) || billMeta;
  const [idnum, setIdnum] = useState("");
  const [checked, setChecked] = useState(null);
  // s441 ide 12: zero-width (\u200b dst) bukan \s — buang sebelum validasi.
  const clean = idnum.replace(/[\s-]/g, "").replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "");
  const idOk = bill.pattern.test(clean);
  const check = () => {
    if (!idOk) return;
    setChecked({ name: maskName(clean) });
  };
  const item = billItem(bill);
  const step1 = (
    <div>
      <label className="flabel" htmlFor="billid">{bill.idLabel}</label>
      {/* s460 ide 71: Enter di kolom nomor tagihan sebelumnya tidak melakukan
          apa-apa (bukan form) — samakan dengan PlnPage (s458 ide 72). */}
      <form onSubmit={(e) => { e.preventDefault(); check(); }}>
      <div style={{ display: "flex", gap: 10 }}>
        <input id="billid" className={"input" + (idnum && !idOk ? " err" : "")} inputMode="numeric" placeholder={bill.idPlaceholder} value={idnum} onChange={(e) => { setIdnum(e.target.value); setChecked(null); }} style={{ flex: 1 }} />
        <button className="btn" type="submit" disabled={!idOk}>{checked ? "Cek Ulang" : "Cek Tagihan"}</button>
      </div>
      </form>
      {idnum && !idOk && <div className="note bad" aria-live="polite">{bill.idLabel} tidak sesuai format ({bill.idPlaceholder.toLowerCase()}).</div>}
      {!checked && idOk && <div className="note">Klik Cek Tagihan untuk melihat rincian tagihan sebelum memilih pembayaran.</div>}
      {checked && (
        <div style={{ marginTop: 12 }}>
          <div className="sum-row"><span>Nama pelanggan</span><b>{checked.name}</b></div>
          <div className="sum-row"><span>Periode</span><b>{bill.bill.period}</b></div>
          <div className="sum-row"><span>Rincian</span><b>{bill.bill.usage}</b></div>
          <div className="sum-row"><span>Tagihan</span><b>{rp(bill.bill.amount)}</b></div>
          <div className="sum-row"><span>Biaya admin</span><b>{rp(BILL_ADMIN)}</b></div>
          <div className="sum-row"><span>Total tagihan</span><b>{rp(item.price)}</b></div>
          <div className="note good">Tagihan ditemukan. Periksa nama & periode sebelum membayar — tagihan yang sudah dibayar tidak bisa dibatalkan.</div>
        </div>
      )}
    </div>
  );
  return (
    <CheckoutShell
      title={bill.name} sub="Pascabayar · cek tagihan dulu, bayar sebelum jatuh tempo"
      initials={bill.initials} color={bill.color}
      step1Title="Masukkan Nomor Tagihan" step1Node={step1}
      targetValid={idOk && !!checked} targetText={idOk ? clean : ""}
      step2Title="Pilih Tagihan" itemLabel="tagihan"
      items={[item]} qtyEnabled={false} kind="tagihan"
    />
  );
}
