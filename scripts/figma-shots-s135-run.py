#!/usr/bin/env python3
"""Driver: get_screenshot 6 frame modal desktop + 2 Beranda Desktop (Siklus 135),
unduh PNG ke /tmp/shot-<label>.png. Pola Siklus 133 (CLI langsung + curl)."""
import json, subprocess, sys

FRAMES = [
    ("stale-s135-home-light", "1:2"),
    ("stale-s135-home-dark", "1:105"),
    ("stale-s135-sk-light", "10:2"),
    ("stale-s135-sk-dark", "10:105"),
    ("stale-s135-rf-light", "13:2"),
    ("stale-s135-rf-dark", "13:111"),
    ("stale-s135-masuk-light", "162:2"),
    ("stale-s135-masuk-dark", "162:111"),
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
