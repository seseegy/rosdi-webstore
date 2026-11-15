#!/usr/bin/env python3
"""Driver Siklus 137: get_screenshot 8 frame Valorant + Wild Rift (mobile +
desktop, Light+Dark) sesudah sinkron Riot ID — cek visual Langkah 1.
Pola figma-shots-s97-run.py (CLI langsung + curl, maxDimension 4096)."""
import json, subprocess, sys

FRAMES = [("s137-valorant-mob-light", "270:2"),
          ("s137-valorant-mob-dark", "270:140"),
          ("s137-wr-mob-light", "274:2"),
          ("s137-wr-mob-dark", "274:140"),
          ("s137-valorant-desk-light", "280:2"),
          ("s137-valorant-desk-dark", "280:250"),
          ("s137-wr-desk-light", "285:2"),
          ("s137-wr-desk-dark", "285:247")]
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
