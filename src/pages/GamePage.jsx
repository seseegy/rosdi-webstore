import { useState } from "react";
import { RIOT_ID_RE } from "../data-core.js";
import { GAMES } from "../data-catalog.js";
import CheckoutShell from "./CheckoutShell.jsx";

// s433 ide 82: kalimat peringatan yang sama dipakai di kedua cabang bantuan.
const ID_WARNING = "Kesalahan penulisan ID di luar tanggung jawab kami, jadi periksa sekali lagi sebelum membayar.";

export default function GamePage({ game: gameMeta }) {
  // App hanya membawa META game (ringan, chunk awal); halaman ini (lazy)
  // melengkapi ke data penuh (tab nominal) dari katalog.
  const game = GAMES.find((x) => x.id === gameMeta.id) || gameMeta;
  const [userId, setUserId] = useState("");
  const [zone, setZone] = useState("");
  const [riotId, setRiotId] = useState("");
  const [server, setServer] = useState(game.servers ? game.servers[0] : "");
  const [showHelp, setShowHelp] = useState(false);
  // s436 ide 2: UID/Zone ditempel ber-spasi ("1234 5678") sebelumnya ditolak,
  // padahal HP & ID PLN membersihkan spasi/strip sebelum validasi — samakan:
  // validasi & target memakai versi bersih, tampilan input tetap mentah.
  // s441 ide 12: zero-width (\u200b dst) bukan \s — "1234\u200b5678" lolos
  // tampil tapi gagal validasi; buang di sini agar yang ditempel dibersihkan.
  const ZW = /\u200b|\u200c|\u200d|\u2060|\uFEFF/g;
  const uidClean = userId.replace(/[\s-]/g, "").replace(ZW, "");
  const zoneClean = zone.replace(/[\s-]/g, "").replace(ZW, "");
  // s446 ide 19: "-" di depan ("-1234") sebelumnya dibuang seperti pemisah
  // sehingga lolos sebagai "1234" — tanda minus di awal bukan pemisah,
  // tolak mentah-mentah (strip di dalam, mis. "12-34", tetap diterima).
  const noLeadMinus = (v) => !/^\s*-/.test(v);
  // s448 ide 40: Zone "0000" (dan UID "000000") sebelumnya lolos karena hanya
  // dicek format angka — ID yang semua nol bukan ID yang sah.
  const notAllZero = (v) => !/^0+$/.test(v);
  // s460-3: batas atas 20 digit (maksud produk yang sudah ada — tadinya
  // /^\d{6,}$/ tanpa batas atas + maxLength={20} memotong diam-diam UID
  // 33/34/36 digit jadi 20 lalu diterima; kini ditolak dengan pesan error).
  const idOk = /^\d{6,20}$/.test(uidClean) && noLeadMinus(userId) && notAllZero(uidClean);
  const zoneOk = !game.needsZone || (/^\d{4,6}$/.test(zoneClean) && noLeadMinus(zone) && notAllZero(zoneClean));
  // s445 ide 43: spasi di sekitar # ("Nama # TAG") dibersihkan sebelum
  // validasi — spasi bukan karakter valid Riot ID, seperti spasi di UID/Zone.
  const riotClean = riotId.replace(/[\s]/g, "").replace(ZW, "");
  const riotOk = !game.riotId || RIOT_ID_RE.test(riotClean);
  const step1 = game.riotId ? (
    <div>
      <label className="flabel" htmlFor="riot">Riot ID</label>
      {/* s437 ide 32: matikan autocapitalize/autocorrect/spellcheck di Riot ID — keyboard iOS sebelumnya bisa mengkapitalisasi huruf pertama nama. */}
      {/* s459 ide 72: Enter di kolom Riot ID tadinya tidak melakukan apa-apa — pindah fokus ke nominal pertama, seperti Enter di kolom HP (PhonePages). */}
      <input id="riot" className={"input" + (riotId ? (riotOk ? " ok" : " err") : "")} autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="NamaKamu#TAG12" value={riotId} onChange={(e) => setRiotId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.querySelector(".nom")?.focus(); } }} aria-required="true" aria-describedby={riotId && !riotOk ? "riot-err" : undefined} />
      <div className="note">
        Contoh penulisan: NamaKamu#TAG12. Riot ID terdiri dari nama + # + tag (3–5 karakter).{" "}
        <button className="hint-link" style={{ marginLeft: 0 }} onClick={() => setShowHelp(!showHelp)}>Cara menemukan Riot ID saya</button>
      </div>
      {showHelp && <div className="note">Buka client Riot atau gamenya — Riot ID (nama + #tag) tercantum di profil akunmu. {ID_WARNING}</div>}
      {riotId && !riotOk && <div className="note bad" id="riot-err" aria-live="polite">Riot ID harus berbentuk Nama#TAG — nama 3–16 karakter, tag 3–5 huruf/angka.</div>}
    </div>
  ) : (
    <div>
      <div className="row2">
        <div>
          <label className="flabel" htmlFor="uid">User ID</label>
          <input id="uid" className={"input" + (userId ? (idOk ? " ok" : " err") : "")} inputMode="numeric" placeholder="12345678" value={userId} onChange={(e) => setUserId(e.target.value)} aria-required="true" aria-describedby={userId && !idOk ? "uid-err" : undefined} />
        </div>
        {game.needsZone && (
          <div>
            <label className="flabel" htmlFor="zone">Zone ID</label>
            <input id="zone" className={"input" + (zone ? (zoneOk ? " ok" : " err") : "")} inputMode="numeric" placeholder="1234" value={zone} onChange={(e) => setZone(e.target.value)} maxLength={8} aria-required="true" aria-describedby={zone && !zoneOk ? "zone-err" : undefined} />
          </div>
        )}
        {game.servers && (
          <div>
            <label className="flabel" htmlFor="server">Server</label>
            <select id="server" className="input" value={server} onChange={(e) => setServer(e.target.value)}>
              {game.servers.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="note">
        {game.needsZone
          ? "Contoh penulisan: 12345678(1234). Zone ID ditulis tanpa tanda kurung juga bisa."
          : "Contoh penulisan: 12345678."}{" "}
        <button className="hint-link" style={{ marginLeft: 0 }} onClick={() => setShowHelp(!showHelp)}>Cara menemukan User ID saya</button>
      </div>
      {showHelp && <div className="note">Buka game, ketuk foto profil di kiri atas — User ID{game.needsZone ? " dan Zone ID" : ""}{game.servers ? " serta server" : ""} tercantum di bawah nama akunmu. {ID_WARNING}</div>}
      {userId && !idOk && <div className="note bad" id="uid-err" aria-live="polite">User ID harus angka, 6–20 digit.</div>}
      {game.needsZone && userId && !zone && <div className="note bad" id="zone-err" aria-live="polite">Zone ID wajib diisi — 4–6 digit angka.</div>}
      {zone && !zoneOk && <div className="note bad" id="zone-err" aria-live="polite">Zone ID harus 4–6 digit angka.</div>}
    </div>
  );
  return (
    <CheckoutShell
      title={game.name} sub={`${game.publisher} · ${game.tagline}`} initials={game.initials} color={game.color}
      step1Title={game.riotId ? "Masukkan Riot ID" : "Masukkan User ID"} step1Node={step1}
      targetValid={game.riotId ? riotOk : (idOk && zoneOk)}
      targetText={game.riotId ? (riotOk ? riotClean : "") : (idOk ? uidClean + (game.needsZone && zone ? ` (${zoneClean})` : "") + (game.servers ? ` · Server ${server}` : "") : "")}
      tabs={game.tabs} qtyEnabled kind="game"
    />
  );
}
