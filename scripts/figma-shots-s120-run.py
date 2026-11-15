#!/usr/bin/env python3
"""Driver Siklus 120: get_screenshot 2 frame mobile Delta Force (Light+Dark).
Pola figma-shots-s119-run.py (CLI langsung + curl, maxDimension 4096)."""
import json, subprocess, sys

FILE_KEY = "CZf0aT00935jutZp7JbkYR"
FRAMES = [("s120-df-light", "279:2"), ("s120-df-dark", "279:141")]
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
        print(label, "NO-URL", r.stdout[-500:], file=sys.stderr); continue
    out = f"/tmp/{label}.png"
    r2 = subprocess.run(["curl", "-sS", "-o", out, url], capture_output=True, text=True, timeout=120)
    print(label, "OK" if r2.returncode == 0 else "CURL-FAIL", out)
