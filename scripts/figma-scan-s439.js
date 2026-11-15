// Read-only audit s439: paritas pasangan Light/Dark per frame.
// - frameList: id, nama, x/y/w/h, jumlah node, jumlah anak langsung, jumlah teks
// - pairs: selisih node, selisih multiset teks (hanya yang berbeda, maks 10
//   per sisi), urutan anak (z-order), selisih dimensi, total karakter teks
//   (untuk modal), daftar badge per tema, hitung tipe node per tema.
// Semua diff dihitung di dalam plugin agar return tetap kecil.
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
const frameList = [];
const byName = {};
for (const f of frames) {
  const all = f.findAll(() => true);
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  // format kompak: [id, nama, x, y, w, h, node, anak, teks]
  const rec = [f.id, f.name, Math.round(f.x), Math.round(f.y), Math.round(f.width), Math.round(f.height), all.length, f.children.length, texts.length];
  frameList.push(rec);
  byName[f.name] = { frame: f, rec, all, texts };
}
function baseName(n) {
  return n.replace(/ — (Light|Dark)$/, "");
}
function themeOf(n) {
  const m = n.match(/ — (Light|Dark)$/);
  return m ? m[1] : null;
}
function multiset(arr) {
  const m = {};
  for (const s of arr) m[s] = (m[s] || 0) + 1;
  return m;
}
function diffMultiset(a, b) {
  // kembalikan [hanyaDiA, hanyaDiB] sebagai daftar string (maks 10 tiap sisi)
  const ma = multiset(a), mb = multiset(b);
  const onlyA = [], onlyB = [];
  for (const k of Object.keys(ma)) {
    const d = ma[k] - (mb[k] || 0);
    for (let i = 0; i < d && onlyA.length < 10; i++) onlyA.push(k.slice(0, 80));
  }
  for (const k of Object.keys(mb)) {
    const d = mb[k] - (ma[k] || 0);
    for (let i = 0; i < d && onlyB.length < 10; i++) onlyB.push(k.slice(0, 80));
  }
  return [onlyA, onlyB];
}
const pairs = [];
const seen = new Set();
for (const f of frames) {
  const base = baseName(f.name);
  const th = themeOf(f.name);
  if (!th || seen.has(base)) continue;
  const L = byName[base + " — Light"], D = byName[base + " — Dark"];
  if (!L || !D) continue;
  seen.add(base);
  const lTexts = L.texts.map((t) => t.characters);
  const dTexts = D.texts.map((t) => t.characters);
  const [onlyL, onlyD] = diffMultiset(lTexts, dTexts);
  const lChild = L.frame.children.map((c) => c.name);
  const dChild = D.frame.children.map((c) => c.name);
  let childOrderSame = lChild.length === dChild.length;
  let firstChildDiff = -1;
  if (childOrderSame) {
    for (let i = 0; i < lChild.length; i++) {
      if (lChild[i] !== dChild[i]) { childOrderSame = false; firstChildDiff = i; break; }
    }
  }
  const typeCount = (all) => {
    const m = {};
    for (const n of all) m[n.type] = (m[n.type] || 0) + 1;
    return m;
  };
  const lt = typeCount(L.all), dt = typeCount(D.all);
  const typeDiff = [];
  for (const k of new Set([...Object.keys(lt), ...Object.keys(dt)])) {
    if ((lt[k] || 0) !== (dt[k] || 0)) typeDiff.push(k + ":" + (lt[k] || 0) + "v" + (dt[k] || 0));
  }
  const badgeCount = (texts) => {
    let n = 0;
    for (const t of texts) if (/Terlaris|Terjual|-\d+%|Flash sale/i.test(t.characters)) n++;
    return n;
  };
  const totalChars = (texts) => texts.reduce((a, t) => a + t.characters.length, 0);
  pairs.push({
    base,
    lw: L.rec[4], lh: L.rec[5], dw: D.rec[4], dh: D.rec[5],
    lNodes: L.rec[6], dNodes: D.rec[6], lTexts: L.rec[8], dTexts: D.rec[8],
    lChars: totalChars(L.texts), dChars: totalChars(D.texts),
    nodeDiff: L.rec[6] - D.rec[6],
    textDiffCount: onlyL.length + onlyD.length,
    onlyLight: onlyL, onlyDark: onlyD,
    childOrderSame, firstChildDiff,
    childCountDiff: lChild.length - dChild.length,
    typeDiff,
    badgeLight: badgeCount(L.texts), badgeDark: badgeCount(D.texts),
  });
}
const unpaired = frames.filter((f) => !themeOf(f.name)).map((f) => f.name);
const totalNodes = frameList.reduce((a, f) => a + f[6], 0);
const totalTexts = frameList.reduce((a, f) => a + f[8], 0);
return { frameCount: frames.length, totalNodes, totalTexts, frameList, pairCount: pairs.length, pairs, unpaired };
