#!/usr/bin/env python3
"""Driver Siklus 100: get_screenshot 10 frame indeks mobile + Paket Data
(Light+Dark). Pola figma-shots-s99-run.py (CLI langsung + curl, maxDimension 4096)."""
import json, subprocess, sys

FRAMES = [("s100-index-pulsa-mob-light", "54:22"),
          ("s100-index-pulsa-mob-dark", "54:90"),
          ("s100-index-data-mob-light", "54:158"),
          ("s100-index-data-mob-dark", "54:226"),
          ("s100-index-emoney-mob-light", "54:288"),
          ("s100-index-emoney-mob-dark", "54:338"),
          ("s100-data-mob-light", "41:2"),
          ("s100-data-mob-dark", "41:94"),
          ("s100-data-desk-light", "46:2"),
          ("s100-data-desk-dark", "46:235")]
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
