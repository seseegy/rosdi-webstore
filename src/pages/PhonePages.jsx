import { useState } from "react";
import { rp, EWALLETS } from "../data-core.js";
import { OPERATORS, detectOperator, DATA_PACKAGES, EMONEY_ITEMS } from "../data-catalog.js";
import { go, phoneOk } from "../lib.js";
import CheckoutShell from "./CheckoutShell.jsx";

/* Rute pulsa / data / e-wallet berbagi satu chunk: OperatorIndex, PhonePage,
   dan EmoneyIndex semuanya memakai CheckoutShell yang sama. */
export function OperatorIndex({ mode }) {
  const ops = mode === "data" ? OPERATORS.filter((o) => DATA_PACKAGES[o.id]) : OPERATORS;
  return (
    <div className="wrap">
      <div className="crumb">
        <button className="back" onClick={() => go("#/")} aria-label="Kembali">‹</button>
        <div><h1>{mode === "data" ? "Paket Data" : "Pulsa Reguler"}</h1><p>Pilih operator untuk melihat nominal dan harga</p></div>
      </div>
      <div className="grid c3">
        {ops.map((o) => {
          // s440 ide 34: daftar kosong sebelumnya menghasilkan
          // reduce(..., Infinity) -> "Dari RpInfinity". Tampilkan "—" saja.
          const list = mode === "data" ? DATA_PACKAGES[o.id] : o.pulsa;
          const min = list.reduce((m, i) => Math.min(m, i.price), Infinity);
          return (
          <a key={o.id} className="card" href={`#/${mode}/${o.id}`}>
            <span className="tile" style={{ background: o.color }}>{o.initials}</span>
            <div className="p-name">{o.name}</div>
            {/* s440 ide 51: kartu indeks pulsa tadinya tidak menampilkan jumlah
                nominal (kartu indeks data menampilkan "N paket tersedia"). */}
            <div className="p-sub">{mode === "data" ? `${DATA_PACKAGES[o.id].length} paket tersedia` : o.transfer ? `Reguler & transfer · ${o.pulsa.length} nominal` : `Pulsa reguler · ${o.pulsa.length} nominal`}</div>
            <div className="p-from">{Number.isFinite(min) ? `Dari ${rp(min)}` : "Belum ada harga"}</div>
          </a>
          );
        })}
      </div>
    </div>
  );
}

export function PhonePage({ mode, op: opMeta, wallet }) {
  // App hanya membawa META operator; lengkapi ke data penuh dari katalog.
  const op = opMeta ? OPERATORS.find((x) => x.id === opMeta.id) || opMeta : null;
  const [phone, setPhone] = useState("");
  // s441 ide 12: zero-width (\u200b dst) bukan \s — buang sebelum validasi.
  // s447 ide 37: kurung format buku kontak "(0812) 3456-7890" dibersihkan juga
  // seperti spasi/strip — kurung bukan karakter valid nomor HP.
  const clean = phone.replace(/[\s().-]/g, "").replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "").replace(/^\+?62/, "0");
  const detected = detectOperator(clean);
  const mismatch = (mode === "pulsa" || mode === "data") && detected && op && detected.id !== op.id;
  const unknownOp = mode !== "emoney" && clean.length >= 10 && !detected;
  const valid = phoneOk(clean) && !mismatch && !unknownOp;
  const brand = wallet || op;
  const items = mode === "pulsa" ? op.pulsa : mode === "data" ? DATA_PACKAGES[op.id] : EMONEY_ITEMS;
  // s439 ide 16: judul halaman pulsa/data di kode tadinya nama operator saja
  // ("Telkomsel") — Figma menulis "Pulsa Telkomsel"/"Paket Data Telkomsel"
  // dan ringkasan/Sukses ikut memakai judul ini, jadi samakan dengan Figma.
  const title = mode === "pulsa" ? "Pulsa " + op.name : mode === "data" ? "Paket Data " + op.name : brand.name;
  // Operator yang mendukung transfer pulsa: langkah 2 memakai tab
  // Reguler/Transfer dari CheckoutShell (pola yang sama dengan tab game).
  const tabs = mode === "pulsa" && op.transfer ? { "Reguler": op.pulsa, "Transfer": op.transfer } : null;
  const step1 = (
    <div>
      <label className="flabel" htmlFor="hp">Nomor HP {mode === "emoney" ? "terdaftar di " + wallet.name.replace("Saldo ", "") : "tujuan"}</label>
      {/* s458 ide 71: Enter di kolom HP sebelumnya tidak melakukan apa-apa — pindahkan fokus ke kartu nominal pertama (langkah berikutnya). */}
      {/* s461 ide 1: border hijau saat nomor HP valid — sebelumnya input ini
          satu-satunya tanpa kelas .ok di Langkah 1 (UID/Zone/Riot sudah punya);
          .ok hanya saat nomor sah DAN operator cocok (valid), bukan sekadar lolos phoneOk. */}
      <input id="hp" className={"input" + (clean && !phoneOk(clean) ? " err" : valid ? " ok" : "")} inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} aria-required="true" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.querySelector(".nom")?.focus(); } }} />
      {/* s458 ide 65: catatan ini ada di Figma (Saldo DANA Desktop) tapi tidak ada di kode — samakan. */}
      {mode === "emoney" && <div className="note">Saldo masuk ke nomor {wallet.name.replace("Saldo ", "")} yang terdaftar — pastikan nomor aktif dan sesuai.</div>}
      {clean.length >= 4 && !detected && mode !== "emoney" && <div className={"note" + (unknownOp ? " bad" : "")} aria-live="polite">{unknownOp ? "Awalan nomor ini tidak dikenali sebagai operator mana pun — periksa kembali nomornya sebelum lanjut." : "Operator belum dikenali dari awalan nomor ini."}</div>}
      {detected && !mismatch && mode !== "emoney" && <div className="note good" aria-live="polite">Operator terdeteksi: {detected.name}.</div>}
      {/* s458 ide 68-70 (sisi teks): tautan ini memakai var(--blue) sebagai warna teks — di Dark 4,47:1; --blue-text 6,88:1. */}
      {mismatch && <div className="note bad" aria-live="polite">Nomor ini terdeteksi sebagai {detected.name}, bukan {op.name}. <a href={`#/${mode}/${detected.id}`} style={{ color: "var(--blue-text)", fontWeight: 600 }}>Pindah ke {detected.name}</a>.</div>}
      {clean && !phoneOk(clean) && <div className="note bad" aria-live="polite">Nomor HP harus diawali 08 dan 10–13 digit.</div>}
    </div>
  );
  return (
    <CheckoutShell
      title={title} sub={mode === "pulsa" ? (op.transfer ? "Pulsa reguler & transfer · masuk dalam hitungan detik" : "Pulsa reguler · masuk dalam hitungan detik") : mode === "data" ? "Paket data · aktif otomatis" : "Isi saldo e-wallet · admin sudah termasuk"}
      initials={brand.initials} color={brand.color}
      step1Title="Masukkan Nomor HP" step1Node={step1}
      targetValid={valid} targetText={valid ? clean : ""}
      tabs={tabs} items={items} qtyEnabled={false} kind={mode}
      destOpName={mode === "pulsa" ? op.name : undefined}
    />
  );
}

export function EmoneyIndex() {
  return (
    <div className="wrap">
      <div className="crumb">
        <button className="back" onClick={() => go("#/")} aria-label="Kembali">‹</button>
        <div><h1>Saldo E-Wallet</h1><p>Admin sudah termasuk di harga yang tampil</p></div>
      </div>
      <div className="grid c3">
        {EWALLETS.map((w) => (
          <a key={w.id} className="card" href={`#/emoney/${w.id}`}>
            <span className="tile" style={{ background: w.color }}>{w.initials}</span>
            <div className="p-name">{w.name}</div>
            <div className="p-sub">Ke nomor HP yang terdaftar di aplikasi</div>
            <div className="p-from">Dari {rp(EMONEY_ITEMS[0].price)}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
