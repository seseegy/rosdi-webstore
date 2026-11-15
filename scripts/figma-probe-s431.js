// Read-only probe gabungan Siklus 431 (ide 17, 24, 59, 84, 85, 86, 87).
// 17: hitung item katalog tiap game yang teks namanya ada di frame mobile.
// 24: lebar isi vs rel progress flash di Beranda Light.
// 59: teks isi modal S&K (Light) untuk dibanding DOCS Footer.jsx.
// 84/85: posisi x/lebar anak tingkat atas frame Desktop Beranda & Cek.
// 86: banding geometri Beranda Light vs Dark per nama node.
// 87: teks beku (tinggi <=10px padahal karakter panjang) di seluruh file.
const CATALOG = {
  "1:208": ["3 Diamonds","5 Diamonds","12 Diamonds","28 Diamonds","44 Diamonds","59 Diamonds","86 Diamonds","172 Diamonds","257 Diamonds","344 Diamonds","514 Diamonds","706 Diamonds","1050 Diamonds","2195 Diamonds","Weekly Diamond Pass","2x Weekly Diamond Pass","Twilight Pass"],
  "111:2": ["5 Diamonds","12 Diamonds","50 Diamonds","70 Diamonds","140 Diamonds","355 Diamonds","720 Diamonds","1450 Diamonds","Membership Mingguan","Booyah Pass","Membership Bulanan"],
  "6:2": ["60 Genesis Crystal","330 Genesis Crystal","1090 Genesis Crystal","2240 Genesis Crystal","3880 Genesis Crystal","Blessing of the Welkin Moon"],
  "114:2": ["60 UC","325 UC","660 UC","1800 UC"],
  "116:2": ["16 Token","80 Token","240 Token","400 Token","800 Token","2400 Token","Weekly Card","Weekly Card Plus"],
  "120:2": ["80 Robux","400 Robux","800 Robux","1700 Robux"],
};
const byId = {};
for (const f of figma.currentPage.children) byId[f.id] = f;
const out = { nominal: {}, flash: null, modalSK: null, desk: {}, lightDark: null, frozen: { count: 0, samples: [] } };

// 17
for (const [fid, names] of Object.entries(CATALOG)) {
  const frame = byId[fid];
  if (!frame) { out.nominal[fid] = "FRAME HILANG"; continue; }
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim());
  const found = names.filter((n) => texts.includes(n));
  const missing = names.filter((n) => !texts.includes(n));
  out.nominal[frame.name] = { expected: names.length, found: found.length, missing };
}
// 24: progress di Beranda Light 1:2 — rect tinggi 6px = bar progress
{
  const frame = byId["1:2"];
  const rects = frame.findAllWithCriteria({ types: ["RECT"] })
    .map((r) => ({ w: +r.width.toFixed(1), h: +r.height.toFixed(1), y: +r.absoluteBoundingBox.y.toFixed(1), fill: r.fills && r.fills[0] && r.fills[0].color ? [r.fills[0].color.r, r.fills[0].color.g, r.fills[0].color.b].map((v) => +v.toFixed(2)).join(",") : "?" }))
    .filter((r) => r.h === 6);
  const soldTexts = frame.findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => /Terjual \d+%/.test(t.characters)).map((t) => t.characters);
  out.flash = { bars6px: rects, soldTexts };
}
// 59: teks dalam kartu modal frame 10:2 — cari node bernama mengandung "Modal" lalu semua TEXT di dalamnya; fallback: semua TEXT dengan y relatif 430-820
{
  const frame = byId["10:2"];
  const fb = frame.absoluteBoundingBox;
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => { const b = t.absoluteBoundingBox; const ry = b.y - fb.y; return ry > 430 && ry < 830; })
    .map((t) => t.characters);
  out.modalSK = texts;
}
// 84/85: anak tingkat atas
for (const [fid, label] of [["20:2", "berandaDesk"], ["36:2", "cekDesk"]]) {
  const frame = byId[fid];
  out.desk[label] = frame.children.slice(0, 14).map((c) => ({ name: c.name.slice(0, 28), x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
}
// 86: geometri Light vs Dark Beranda (relatif ke frame, kunci nama+urutan)
{
  const mapGeom = (frame) => {
    const m = {};
    const walk = (n) => {
      if (n.type === "TEXT" || n.type === "RECT" || n.type === "FRAME") {
        const key = n.name;
        m[key] = m[key] || [];
        m[key].push([+n.x.toFixed(1), +n.y.toFixed(1), +n.width.toFixed(1), +n.height.toFixed(1)]);
      }
      if ("children" in n) for (const c of n.children) walk(c);
    };
    walk(frame);
    return m;
  };
  const L = mapGeom(byId["1:2"]);
  const D = mapGeom(byId["1:105"]);
  const mism = [];
  let compared = 0;
  for (const k of Object.keys(L)) {
    if (!D[k]) { mism.push({ name: k, issue: "hilang di Dark" }); continue; }
    const n = Math.min(L[k].length, D[k].length);
    for (let i = 0; i < n; i++) {
      compared++;
      const a = L[k][i], b = D[k][i];
      if (Math.abs(a[0]-b[0]) > 0.6 || Math.abs(a[1]-b[1]) > 0.6 || Math.abs(a[2]-b[2]) > 0.6 || Math.abs(a[3]-b[3]) > 0.6) {
        if (mism.length < 12) mism.push({ name: k, idx: i, light: a, dark: b });
      }
    }
    if (L[k].length !== D[k].length) mism.push({ name: k, issue: "jumlah beda L=" + L[k].length + " D=" + D[k].length });
  }
  out.lightDark = { compared, mismatches: mism.length, samples: mism };
}
// 87: teks beku di seluruh file
for (const frame of figma.currentPage.children) {
  const texts = frame.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    if ((t.height <= 10.5 && t.characters.length > 5) || (t.height < 12 && t.characters.length > 60)) {
      out.frozen.count++;
      if (out.frozen.samples.length < 10) out.frozen.samples.push({ frame: frame.name, id: t.id, h: +t.height.toFixed(1), chars: t.characters.slice(0, 60) });
    }
  }
}
return out;
