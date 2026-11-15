#!/usr/bin/env python3
"""Driver: get_screenshot 6 frame modal desktop + 2 Beranda Desktop (Siklus 134),
unduh PNG ke /tmp/shot-<label>.png. Pola Siklus 133 (CLI langsung + curl)."""
import json, subprocess, sys

FRAMES = [
    ("clones-desk-s134-masuk-light", "165:2"),
    ("clones-desk-s134-masuk-dark", "165:247"),
    ("clones-desk-s134-sk-light", "170:2"),
    ("clones-desk-s134-sk-dark", "170:247"),
    ("clones-desk-s134-rf-light", "170:492"),
    ("clones-desk-s134-rf-dark", "170:737"),
    ("clones-desk-s134-home-light", "20:2"),
    ("clones-desk-s134-home-dark", "21:2"),
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
