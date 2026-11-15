#!/usr/bin/env python3
"""Driver Siklus 118: get_screenshot 2 frame mobile Wild Rift (Light+Dark).
Pola figma-shots-s116-run.py (CLI langsung + curl, maxDimension 4096)."""
import json, subprocess, sys

FRAMES = [("s118-wr-light", None),
          ("s118-wr-dark", None)]
FILE_KEY = "CZf0aT00935jutZp7JbkYR"
# node id diisi setelah build (frame baru); driver membaca dari file JSON
# /tmp/wr-frame-ids.json bila ada, kalau tidak pakai argumen CLI.
ids = {}
try:
    ids = json.load(open("/tmp/wr-frame-ids.json"))
except Exception:
    pass
if len(sys.argv) > 2:
    ids = {"light": sys.argv[1], "dark": sys.argv[2]}
FRAMES = [("s118-wr-light", ids.get("light")),
          ("s118-wr-dark", ids.get("dark"))]
ok = 0
for label, node_id in FRAMES:
    if not node_id:
        print(label, "NO-ID", file=sys.stderr)
        continue
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
