#!/usr/bin/env python3
"""Driver Siklus 140: get_screenshot 12 frame Pascabayar
(Light+Dark) — cek visual ulang, terakhir dicek di siklus
pembuatannya (130/131/132).
Indeks Tagihan (306:25/306:102 mobile, 306:156/306:256 desktop),
Cek Tagihan PLN Pascabayar (311:2/311:88 mobile, 311:174/311:406 desktop),
Sukses Pascabayar (317:2/317:29 mobile, 317:56/317:132 desktop).
Pola figma-shots-s139-run.py (CLI langsung + curl, maxDimension 4096)."""
import json, subprocess, sys

FRAMES = [("s140-idx-bill-mob-light", "306:25"),
          ("s140-idx-bill-mob-dark", "306:102"),
          ("s140-idx-bill-desk-light", "306:156"),
          ("s140-idx-bill-desk-dark", "306:256"),
          ("s140-bill-mob-light", "311:2"),
          ("s140-bill-mob-dark", "311:88"),
          ("s140-bill-desk-light", "311:174"),
          ("s140-bill-desk-dark", "311:406"),
          ("s140-sukses-bill-mob-light", "317:2"),
          ("s140-sukses-bill-mob-dark", "317:29"),
          ("s140-sukses-bill-desk-light", "317:56"),
          ("s140-sukses-bill-desk-dark", "317:132")]
FILE_KEY = "CZf0aT00935jutZp7JbkYR"
ok = 0
for label, node_id in FRAMES:
    args = {"fileKey": FILE_KEY, "nodeId": node_id, "maxDimension": 4096}
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "get_screenshot",
         "--arguments-json", json.dumps(args)],
        capture_output=True, text=True, timeout=180,
    )
    url = None
    try:
        outer = json.loads(r.stdout)
        for entry in outer["result"]["content"]:
            if entry.get("type") == "text" and "image_url" in entry.get("text", ""):
                url = json.loads(entry["text"])["image_url"]
                break
    except Exception as e:
        print(label, "PARSE-FAIL", e, r.stdout[:300], file=sys.stderr)
    if not url:
        print(label, "NO-URL", r.stdout[:300], file=sys.stderr)
        continue
    out = f"/tmp/shot-{label}.png"
    c = subprocess.run(["curl", "-f", "-s", "-L", "-o", out, url],
                       capture_output=True, text=True, timeout=120)
    if c.returncode != 0:
        print(label, "CURL-FAIL", c.stderr[:200], file=sys.stderr)
        continue
    print(label, node_id, "->", out)
    ok += 1
print("OK:", ok, "/", len(FRAMES))
