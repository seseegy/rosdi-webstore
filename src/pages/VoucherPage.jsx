import { useState } from "react";
import CheckoutShell from "./CheckoutShell.jsx";

export default function VoucherPage({ voucher }) {
  const [email, setEmail] = useState("");
  // s441 ide 12: zero-width (\u200b dst) bukan \s — buang sebelum validasi
  // agar email yang ditempel dengan karakter tak terlihat tetap lolos.
  const emailClean = email.replace(/\u200b|\u200c|\u200d|\u2060|\uFEFF/g, "");
  // s446 ide 15: tolak titik di awal local-part (".nama@mail.com") dan
  // titik di ujung local-part / awal domain — titik ganda sudah ditolak
  // (s445 ide 33); regex sama dengan CheckoutShell.jsx (duplikasi disengaja
  // karena lib.js/data.js tidak boleh diubah — chunk awal).
  // s454 ide 44: batas panjang RFC 5321 — local-part maks 64 karakter,
  // total maks 254 karakter; regex format saja tidak membatasi panjang.
  // s455 ide 41/42: label domain harus RFC 1035 (huruf/angka, boleh strip
  // di tengah, tidak boleh diawali/diakhiri strip; tanpa underscore).
  const emailTrim = emailClean.trim();
  // s457 ide 37: TLD hanya huruf (IANA) — "nama@mail.c0m" sebelumnya lolos.
  // s465-6: label domain maks 63 karakter (RFC 1035) — "nama@<64 huruf>.com"
  // sebelumnya lolos; tengah label {0,61} + TLD {2,63}.
  const ok = /^(?!\.)(?!.*\.\.)(?!.*\.@)(?!.*@\.)[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(emailTrim) && emailTrim.length <= 254 && emailTrim.split("@")[0].length <= 64;
  // s445 ide 32: bedakan pesan saat domain tidak lengkap ("nama@email").
  const domainIncomplete = emailClean.includes("@") && !/@[^\s@]*\./.test(emailClean);
  const step1 = (
    <div>
      {/* Fase 4 B6 (s452-10): label + catatan lama mengklaim kode "dikirim
          ke email" — belum ada backend pengiriman. Kode tampil di Sukses;
          email ini dicatat sebagai kontak bukti. */}
      <label className="flabel" htmlFor="vemail">Email kontak</label>
      {/* s460 ide 72: Enter di kolom email voucher sebelumnya tidak melakukan
          apa-apa — pindahkan fokus ke nominal pertama (pola Riot ID s459 ide 72). */}
      {/* s465 ide 8: border hijau saat email voucher valid — sebelumnya input
          ini tanpa kelas .ok (email Detail Kontak sudah punya sejak s460
          ide 2); pola yang sama: .ok hanya saat ada isi dan sah. */}
      <input id="vemail" className={"input" + (email ? (ok ? " ok" : " err") : "")} type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-required="true" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.querySelector(".nom")?.focus(); } }} />
      {email && !ok && <div className="note bad" aria-live="polite">{domainIncomplete ? "Domain email belum lengkap — tambahkan akhiran seperti .com." : "Format email belum benar."}</div>}
      <div className="note">Kode voucher tampil di halaman sukses setelah pembayaran terkonfirmasi. Email ini dicatat sebagai kontak bukti — periksa ejaannya.</div>
      <div className="note">{voucher.redeem}</div>
    </div>
  );
  return (
    <CheckoutShell
      title={voucher.name} sub="Kode digital · tampil di halaman sukses" initials={voucher.initials} color={voucher.color}
      step1Title="Masukkan Email Tujuan" step1Node={step1}
      targetValid={ok} targetText={ok ? emailClean.trim() : ""}
      items={voucher.items} qtyEnabled={false} kind="voucher"
    />
  );
}
