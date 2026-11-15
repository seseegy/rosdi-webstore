#!/usr/bin/env python3
"""Driver read-only: get_screenshot 8 frame data 10 paket (Siklus 128),
unduh PNG ke /tmp/shot-<label>.png."""
import json, subprocess, sys

FRAMES = [
    ("data10-mobile-light", "41:2"),
    ("data10-mobile-dark", "41:94"),
    ("data10-desk-light", "46:2"),
    ("data10-desk-dark", "46:235"),
    ("idxdata-mobile-light", "54:158"),
    ("idxdata-mobile-dark", "54:226"),
    ("idxdata-desk-light", "51:2"),
    ("idxdata-desk-dark", "51:96"),
]

FILE_KEY = "CZf0aT00935jutZp7JbkYR"
ok = 0
for label, node_id in FRAMES:
    args = {"fileKey": FILE_KEY, "nodeId": node_id, "maxDimension": 1024}
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
