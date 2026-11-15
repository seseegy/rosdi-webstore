#!/usr/bin/env python3
"""Siklus 29: perbaiki grid nominal Token PLN mobile (Light 2:116 + Dark 2:181)
dari 3 kolom x 2 baris menjadi 2 kolom x 3 baris, sesuai .nom-grid di kode
(repeat(2, ...) pada <=560px; frame 390px). Akar cacat: sel 104px membuat
"Token 1.000.000" membungkus 2 baris dan menimpa harga Rp1.002.500.
Sel baru 158px: nama muat 1 baris. Kartu Langkah 2 +44px; semua simpul di
bawahnya geser +44; tinggi frame 1064 -> 1108."""
import json, subprocess, sys

CODE = r"""
const THEMES = [
  { frame: '2:116', cells: [
    { rect: '2:137', name: '2:138', price: '2:139', meta: '2:140' }, // 20.000
    { rect: '2:141', name: '2:142', price: '2:143', meta: '2:144' }, // 50.000 (terpilih)
    { rect: '2:145', name: '2:146', price: '2:147', meta: '2:148' }, // 100.000
    { rect: '2:149', name: '2:150', price: '2:151', meta: '2:152' }, // 200.000
    { rect: '2:153', name: '2:154', price: '2:155', meta: '2:156' }, // 500.000
    { rect: '2:157', name: '2:158', price: '2:159', meta: '2:160' }, // 1.000.000
  ], card: '2:133' },
  { frame: '2:181', cells: [
    { rect: '2:202', name: '2:203', price: '2:204', meta: '2:205' },
    { rect: '2:206', name: '2:207', price: '2:208', meta: '2:209' },
    { rect: '2:210', name: '2:211', price: '2:212', meta: '2:213' },
    { rect: '2:214', name: '2:215', price: '2:216', meta: '2:217' },
    { rect: '2:218', name: '2:219', price: '2:220', meta: '2:221' },
    { rect: '2:222', name: '2:223', price: '2:224', meta: '2:225' },
  ], card: '2:198' },
];
const POS = [[32, 314], [200, 314], [32, 376], [200, 376], [32, 438], [200, 438]];
const SHIFT = 44;
const out = [];
for (const t of THEMES) {
  const frame = figma.getNodeById(t.frame);
  const moved = [];
  t.cells.forEach((c, i) => {
    const [cx, cy] = POS[i];
    const rect = figma.getNodeById(c.rect);
    rect.x = cx; rect.y = cy; rect.resize(158, 54);
    const nm = figma.getNodeById(c.name);
    nm.x = cx + 12; nm.y = cy + 8;
    nm.textAutoResize = 'HEIGHT'; nm.resize(134, 13);
    const pr = figma.getNodeById(c.price);
    pr.x = cx + 12; pr.y = cy + 26;
    const mt = figma.getNodeById(c.meta);
    mt.x = cx + 12; mt.y = cy + 41;
    moved.push(c.rect);
  });
  const card = figma.getNodeById(t.card);
  card.resize(358, 206 + SHIFT);
  let shifted = 0;
  for (const ch of frame.children) {
    if (ch.y >= 480 && !moved.includes(ch.id) && ch.id !== t.card) { ch.y += SHIFT; shifted++; }
  }
  frame.resize(390, 1064 + SHIFT);
  const bad = figma.getNodeById(t.cells[5].name);
  out.push({ frame: t.frame, cellsMoved: moved.length, shiftedBelow: shifted,
    cardH: card.height, frameH: frame.height,
    jtName: { h: bad.height, w: bad.width, chars: bad.characters } });
}
return out;
"""

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 29: grid nominal PLN mobile 3 kolom -> 2 kolom (Light+Dark)",
    "code": CODE,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode)
print(r.stdout[-2500:])
print(r.stderr[-1000:], file=sys.stderr)
