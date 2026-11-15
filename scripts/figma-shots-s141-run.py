#!/usr/bin/env python3
"""Driver Siklus 141: get_screenshot 12 frame game baru Tahap 5
(CoD Mobile, Arena of Valor, Delta Force — mobile + desktop)
— cek visual ulang, terakhir dicek di siklus pembuatannya
(117/119/120 mobile, 122/124/125 desktop; Valorant + Wild Rift
sudah dicek ulang Siklus 137).
CoD Mobile (272:2/272:141 mobile, 283:2/283:244 desktop),
Arena of Valor (277:2/277:141 mobile, 286:2/286:244 desktop),
Delta Force (279:2/279:141 mobile, 287:2/287:244 desktop).
Pola figma-shots-s140-run.py (CLI langsung + curl, maxDimension 4096)."""
import json, subprocess, sys

FRAMES = [("s141-cod-mob-light", "272:2"),
          ("s141-cod-mob-dark", "272:141"),
          ("s141-cod-desk-light", "283:2"),
          ("s141-cod-desk-dark", "283:244"),
          ("s141-aov-mob-light", "277:2"),
          ("s141-aov-mob-dark", "277:141"),
          ("s141-aov-desk-light", "286:2"),
          ("s141-aov-desk-dark", "286:244"),
          ("s141-df-mob-light", "279:2"),
          ("s141-df-mob-dark", "279:141"),
          ("s141-df-desk-light", "287:2"),
          ("s141-df-desk-dark", "287:244")]
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
