#!/usr/bin/env python3
"""Driver Siklus 97: get_screenshot 12 frame mobile game (Light+Dark) — cek visual
ulang, terakhir dicek Siklus 84.
Pola figma-shots-s84-run.py (CLI langsung + curl, maxDimension 4096)."""
import json, subprocess, sys

FRAMES = [("s97-game-ff-mob-light", "111:2"),
          ("s97-game-ff-mob-dark", "111:139"),
          ("s97-game-pubg-mob-light", "114:2"),
          ("s97-game-pubg-mob-dark", "114:125"),
          ("s97-game-hok-mob-light", "116:2"),
          ("s97-game-hok-mob-dark", "116:132"),
          ("s97-game-roblox-mob-light", "120:2"),
          ("s97-game-roblox-mob-dark", "120:125"),
          ("s97-game-mlbb-mob-light", "1:208"),
          ("s97-game-mlbb-mob-dark", "1:314"),
          ("s97-game-gi-mob-light", "6:2"),
          ("s97-game-gi-mob-dark", "6:108")]
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
