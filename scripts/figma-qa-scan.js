// Read-only QA scan: semua teks berisi "Rp" per frame teratas, untuk
// dibandingkan dengan harga di src/data.js. Tidak mengubah apa pun.
// Format kompak (Siklus 44): frames = [frameId, [[nodeId, chars], ...]]
// — objek {id, chars} + nama frame menembus batas 48KB per return
// use_figma pada 80 frame (50.401 byte). Chars dipotong 40 (harga
// terpanjang "Mulai Rp1.002.500" cuma 17 karakter; teks dua angka Rp
// terpanjang "Harga + biaya Rp43.500 + Rp0" 26 karakter).
// Batas 48KB (Siklus 125): 116 frame = 48.439 byte, jadi driver memanggil
// scan 2x per rentang frame (__FROM__..__TO__) lalu menggabungkan dump.
const FROM = __FROM__;
const TO = __TO__;
const out = [];
for (const frame of figma.currentPage.children.slice(FROM, TO)) {
  const hits = [];
  const texts = frame.findAllWithCriteria({ types: ['TEXT'] });
  for (const t of texts) {
    if (/Rp[\d.,]/.test(t.characters)) {
      hits.push([t.id, t.characters.slice(0, 40)]);
    }
  }
  out.push([frame.id, hits]);
}
return { frameCount: out.length, totalRpTexts: out.reduce((a, f) => a + f[1].length, 0), frames: out };
