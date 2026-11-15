import { useEffect, useRef, useState } from "react";
import { rp, GAMES_META as GAMES, EWALLETS, VOUCHERS, FLASH_SALE, CATEGORY_COLORS, PULSA_TOKENS, PLN_TOKENS, DATA_TOKENS } from "../data-core.js";
import { matchSearch } from "../lib.js";
import { useRoving } from "../roving.js";

function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => {
      const end = new Date(); end.setHours(24, 0, 0, 0);
      setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(left / 3600)).padStart(2, "0");
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Ikon garis gaya lucide (stroke 1.5, currentColor) untuk kartu trust —
// menggantikan glif dingbat agar satu set ikon konsisten (unslop pass ikon).
const BoltIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
);
const HeadsetIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
);

function FlashCountdown() {
  const countdown = useCountdown();
  return <span className="count-chip">Berakhir {countdown}</span>;
}

export default function Home() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("semua");
  // B2 — roving tabindex chip kategori (s467-2): Home/End + panah kiri/kanan,
  // seleksi mengikuti fokus (chip = grup pilih-satu seperti tab).
  const CATS = [["semua", "Semua"], ["game", "Top Up Game"], ["pulsa", "Pulsa"], ["data", "Paket Data"], ["pln", "Token PLN"], ["tagihan", "Tagihan"], ["emoney", "E-Wallet"], ["voucher", "Voucher"]];
  const chips = useRoving(CATS.length, (i) => setCat(CATS[i][0]));
  // B2 — pintasan pencarian (s456-4): Ctrl+K/Cmd+K atau "/" fokus ke kolom
  // cari, kecuali sedang mengetik di input lain. Enter di kolom cari
  // (s458-2) memindah fokus ke hasil pertama.
  const searchRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing = t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      else if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const onSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.querySelector(".grid a.card")?.focus();
    }
  };
  // Akar s452-1: tokenisasi AND + normalisasi (lib.js) — query "nama + angka"
  // harus ketemu. Teks cocok per jenis produk:
  // - game: nama + publisher + inisial + aka + "game topup" + g.search
  //   (string indeks: semua nama + harga item tab, dari data-core.js);
  // - voucher: nama + id + inisial + item (nama + harga);
  // - flash: nama + sub + kata intent + harga + harga coret;
  // - tile pulsa/data/PLN: kata kunci + token angka + "topup".
  const match = (txt) => matchSearch(q, txt);
  const games = GAMES.filter((g) => match(g.name + " " + g.publisher + " " + g.initials + " " + (g.aka || "") + " game topup " + (g.search || "")));
  const ewallets = EWALLETS.filter((w) => match(w.name + " e-wallet saldo topup"));
  const vouchers = VOUCHERS.filter((v) => match(v.name + " " + v.id + " " + v.initials + " voucher topup " + v.items.map((i) => i.name + " " + i.price).join(" ")));
  const flash = FLASH_SALE.filter((f) => match(f.name + " " + f.sub + " promo diskon flash sale topup " + f.price + " " + f.was));
  const showGame = (cat === "semua" || cat === "game") && games.length > 0;
  const showPulsa = (cat === "semua" || cat === "pulsa") && match("pulsa reguler telkomsel by.u byu indosat xl axis tri smartfren " + PULSA_TOKENS.join(" ") + " topup");
  const showData = (cat === "semua" || cat === "data") && match("paket data kuota internet " + DATA_TOKENS.join(" ") + " topup");
  const showPln = (cat === "semua" || cat === "pln") && match("token pln listrik " + PLN_TOKENS.join(" ") + " topup");
  const showTagihan = (cat === "semua" || cat === "tagihan") && match("tagihan pascabayar pln pdam bpjs telkom indihome tv kabel multifinance pbb topup");
  const showEmoney = (cat === "semua" || cat === "emoney") && ewallets.length > 0;
  const showVoucher = (cat === "semua" || cat === "voucher") && vouchers.length > 0;
  const nothing = !flash.length && !showGame && !showPulsa && !showData && !showPln && !showTagihan && !showEmoney && !showVoucher;
  // B7 (s452-6): live region jumlah hasil pencarian — hanya berisi teks saat
  // query tidak kosong; elemennya selalu ada agar perubahan diumumkan.
  const hasilCount = flash.length + (showGame ? games.length : 0) + (showEmoney ? ewallets.length : 0) + (showVoucher ? vouchers.length : 0) + (showPulsa ? 1 : 0) + (showData ? 1 : 0) + (showPln ? 1 : 0) + (showTagihan ? 1 : 0);
  const hasilText = q.trim() ? (hasilCount > 0 ? `${hasilCount} hasil untuk "${q.trim()}"` : `Tidak ada hasil untuk "${q.trim()}"`) : "";

  return (
    <div className="wrap">
      <div className="hero">
        <h1>Top up, harga final sejak awal</h1>
        <p>Game, pulsa, paket data, token PLN, tagihan pascabayar, dan e-wallet dalam satu tempat. Harga final terlihat sebelum kamu membayar — tidak ada biaya siluman.</p>
        <button className="btn" onClick={() => document.getElementById("katalog")?.scrollIntoView({ behavior: "smooth" })}>Mulai top up</button>
      </div>

      <div className="searchbar">
        <div className="field">
          <svg className="mag" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKeyDown} placeholder="Cari produk" aria-label="Cari produk" />
          <kbd className="kbd-hint" aria-hidden="true">Ctrl K</kbd>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{hasilText}</p>

      <div className="chips" role="group" aria-label="Kategori" onKeyDown={chips.onKeyDown}>
        {CATS.map(([id, label], i) => (
          <button key={id} ref={chips.setRef(i)} tabIndex={chips.tabIndex(i)} onFocus={chips.onFocus(i)} className={"chip" + (cat === id ? " on" : "")} aria-pressed={cat === id} onClick={() => setCat(id)}>{label}</button>
        ))}
      </div>

      {flash.length > 0 && (
      <section className="block" id="katalog">
        <div className="sec-head">
          <h2><span lang="en">Flash Sale</span></h2>
          <FlashCountdown />
        </div>
        <div className="grid c2">
          {flash.map((f) => (
            <a key={f.name} className="card" href={`#/game/${f.gameId}`}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span className="tile" style={{ background: f.color }}>{f.initials}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{f.name}</div>
                  <div className="p-sub">{f.sub}</div>
                </div>
                <span className="badge" style={{ marginLeft: "auto" }}>-10%</span>
              </div>
              <div style={{ marginTop: 10, fontWeight: 600, color: "var(--blue-text)", fontSize: 16, fontVariantNumeric: "tabular-nums" }}>
                {rp(f.price)} <span className="was">{rp(f.was)}</span>
              </div>
              <div className="progress"><i style={{ width: f.sold + "%" }} /></div>
              <div className="p-sub" style={{ marginTop: 6 }}>Terjual <span className="sold-num" style={{ "--sold-to": f.sold }} aria-hidden="true" /><span className="sr-only">{f.sold}</span>% dari kuota promo hari ini</div>
            </a>
          ))}
        </div>
      </section>
      )}

      {showGame && (
        <section className="block">
          <div className="sec-head"><h2>Top Up Game</h2><span className="more">Harga mulai dari, final di halaman produk</span></div>
          <div className="grid c4">
            {games.map((g) => (
              <a key={g.id} className="card" href={`#/game/${g.id}`}>
                <span className="tile" style={{ background: g.color }}>{g.initials}</span>
                <div className="p-name">{g.name}</div>
                <div className="p-sub">{g.publisher} · {g.tagline}</div>
                <div className="p-from">Mulai {rp(g.from)}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      {(showPulsa || showData || showPln || showTagihan || showEmoney || showVoucher) && (
        <section className="block">
          <div className="sec-head"><h2>Pulsa, Data, PLN, E-Wallet & Tagihan</h2></div>
          <div className="grid c3">
            {showPulsa && (
              <a className="card" href="#/pulsa">
                <span className="tile" style={{ background: CATEGORY_COLORS.pulsa }}>PL</span>
                <div className="p-name">Pulsa Reguler</div>
                <div className="p-sub">Telkomsel, by.U, Indosat, XL, Axis, Tri, Smartfren</div>
                <div className="p-from">Operator terdeteksi dari nomor</div>
              </a>
            )}
            {showData && (
              <a className="card" href="#/data">
                <span className="tile" style={{ background: CATEGORY_COLORS.data }}>DT</span>
                <div className="p-name">Paket Data</div>
                <div className="p-sub">Kuota utama & paket khusus game</div>
                <div className="p-from">Masa aktif tertulis di tiap paket</div>
              </a>
            )}
            {showPln && (
              <a className="card" href="#/pln">
                <span className="tile" style={{ background: CATEGORY_COLORS.pln }}>LN</span>
                <div className="p-name">Token PLN</div>
                <div className="p-sub">20 ribu sampai 1 juta</div>
                <div className="p-from">Nama pelanggan dicek sebelum bayar</div>
              </a>
            )}
            {showTagihan && (
              <a className="card" href="#/tagihan">
                <span className="tile" style={{ background: CATEGORY_COLORS.tagihan }}>TG</span>
                <div className="p-name">Tagihan Pascabayar</div>
                <div className="p-sub">PLN, PDAM, BPJS, Telkom, TV Kabel & lainnya</div>
                <div className="p-from">Cek tagihan, bayar sebelum jatuh tempo</div>
              </a>
            )}
            {showVoucher && vouchers.map((v) => (
              <a key={v.id} className="card" href={`#/voucher/${v.id}`}>
                <span className="tile" style={{ background: v.color }}>{v.initials}</span>
                <div className="p-name">{v.name}</div>
                <div className="p-sub">Kode voucher tampil di halaman sukses</div>
                <div className="p-from">Dari {rp(v.items[0].price)}</div>
              </a>
            ))}
            {showEmoney && ewallets.map((w) => (
              <a key={w.id} className="card" href={`#/emoney/${w.id}`}>
                <span className="tile" style={{ background: w.color }}>{w.initials}</span>
                <div className="p-name">{w.name}</div>
                <div className="p-sub">Isi saldo ke nomor HP terdaftar</div>
                <div className="p-from">Admin sudah termasuk di harga</div>
              </a>
            ))}
          </div>
        </section>
      )}

      {nothing && <div className="empty">Tidak ada produk yang cocok dengan pencarian itu. Coba kata kunci lain.</div>}

      <section className="block">
        <div className="sec-head"><h2>Kenapa Rosdi Store</h2></div>
        <div className="trust">
          {[
            [BoltIcon, "Proses instan", "Pesanan diproses otomatis dalam hitungan detik, 24 jam."],
            ["Rp", "Harga transparan", "Harga tiap metode pembayaran terlihat sebelum kamu memilih."],
            ["✓", "Garansi uang kembali", "Pesanan gagal? Uang kembali penuh tanpa ribet."],
            [HeadsetIcon, "CS 24/7", "Tim bantuan siap lewat WhatsApp dan email kapan pun."],
          ].map(([ic, t, d]) => (
            <div key={t} className="card"><span className="ic">{ic}</span><div><b>{t}</b><span>{d}</span></div></div>
          ))}
        </div>
      </section>

      <section className="block" id="cara-topup">
        <div className="sec-head"><h2>Cara Top Up</h2></div>
        <div className="grid c3">
          {[
            ["1", "Isi data tujuan", "User ID game, nomor HP, ID pelanggan PLN, atau nomor tagihan — periksa ejaannya, kesalahan penulisan di luar tanggung jawab kami."],
            ["2", "Pilih nominal & pembayaran", "Setiap metode menampilkan harga finalnya sendiri. Tidak ada tambahan biaya setelah ini."],
            // Fase 4 B6 (s452-10): klaim "dikirim ke kontakmu" dihapus —
            // belum ada backend pengiriman; bukti tampil di halaman sukses.
            ["3", "Selesai dalam detik", "Item masuk otomatis. Bukti dan nomor token tampil di halaman sukses."],
          ].map(([n, t, d]) => (
            <div key={n} className="card">
              <span className="step-num">{n}</span>
              <div className="p-name">{t}</div>
              <div className="p-sub">{d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
