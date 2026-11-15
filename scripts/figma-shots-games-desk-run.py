#!/usr/bin/env python3
"""Driver read-only: get_screenshot 10 frame desktop game (Siklus 36-40),
unduh PNG ke /tmp/shot-<label>.png. Dipakai Siklus 42 untuk QA visual ulang."""
import json, subprocess, sys

FRAMES = [
    ("game-gi-desk-light", "84:2"),
    ("game-gi-desk-dark", "84:249"),
    ("game-ff-desk-light", "87:2"),
    ("game-ff-desk-dark", "87:258"),
    ("game-pubg-desk-light", "90:2"),
    ("game-pubg-desk-dark", "90:241"),
    ("game-hok-desk-light", "93:2"),
    ("game-hok-desk-dark", "93:249"),
    ("game-roblox-desk-light", "95:2"),
    ("game-roblox-desk-dark", "95:241"),
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
