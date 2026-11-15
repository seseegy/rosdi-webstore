#!/usr/bin/env python3
"""Driver Siklus 106: get_screenshot 6 frame mobile Pulsa + E-Wallet + PLN
(Light+Dark). Pola figma-shots-s105-run.py (CLI langsung + curl,
maxDimension 4096)."""
import json, subprocess, sys

FRAMES = [("s106-pulsa-mobile-light", "2:2"),
          ("s106-pulsa-mobile-dark", "2:59"),
          ("s106-emoney-mobile-light", "3:2"),
          ("s106-emoney-mobile-dark", "3:60"),
          ("s106-pln-mobile-light", "2:116"),
          ("s106-pln-mobile-dark", "2:181")]
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
