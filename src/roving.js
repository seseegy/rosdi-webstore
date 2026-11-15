import { useRef, useState } from "react";

// B2 — roving tabindex: satu pemberhentian Tab per grup, tombol panah
// memindah fokus (Home/End ke ujung). Dipakai chip kategori Beranda,
// tab game, grid nominal, daftar metode bayar, dan riwayat Cek.
// - onActivate(i): bila diberikan, seleksi mengikuti fokus (tab/chip);
//   bila tidak, panah hanya memindah fokus (grid nominal, metode bayar,
//   riwayat — aktivasi tetap via Enter/Space seperti tombol biasa).
// - cols: jumlah kolom grid (nominal) agar ArrowUp/Down lompat sebaris;
//   dihitung pemanggil dari computed style saat keydown.
export function rovingIndex(key, idx, n, cols = 1) {
  switch (key) {
    case "ArrowRight": return Math.min(n - 1, idx + 1);
    case "ArrowLeft": return Math.max(0, idx - 1);
    case "ArrowDown": return Math.min(n - 1, idx + cols);
    case "ArrowUp": return Math.max(0, idx - cols);
    case "Home": return 0;
    case "End": return n - 1;
    default: return -1;
  }
}

export function useRoving(count, onActivate, initial = 0) {
  const refs = useRef([]);
  const [active, setActive] = useState(initial);
  const setRef = (i) => (el) => { refs.current[i] = el; };
  const focusAt = (i) => {
    const el = refs.current[i];
    if (!el || !el.isConnected) return;
    el.focus();
    setActive(i);
    if (onActivate) onActivate(i);
  };
  const onKeyDown = (e, cols = 1) => {
    const items = refs.current.slice(0, count);
    const idx = items.indexOf(document.activeElement);
    if (idx < 0) return;
    let t = rovingIndex(e.key, idx, count, cols);
    if (t < 0 || t === idx) return;
    // Lewati tombol nonaktif (mis. metode bayar berstatus "Gangguan").
    const step = e.key === "ArrowDown" ? cols : e.key === "ArrowUp" ? -cols : e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    while (step !== 0 && items[t] && items[t].disabled) {
      const nt = t + step;
      if (nt < 0 || nt >= count) break;
      t = nt;
    }
    if (!items[t] || items[t].disabled) return;
    e.preventDefault();
    focusAt(t);
  };
  // Klik/Tab ke item lain memindah pemberhentian Tab ke sana.
  const onFocus = (i) => () => setActive(i);
  const tabIndex = (i) => (i === active ? 0 : -1);
  return { setRef, onKeyDown, onFocus, tabIndex, focusAt, setActive };
}
