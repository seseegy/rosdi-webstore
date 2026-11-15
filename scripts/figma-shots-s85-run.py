#!/usr/bin/env python3
"""Driver Siklus 85: get_screenshot 10 frame Beranda mobile + pencarian + modal
mobile (Light+Dark) — cek visual ulang, terakhir dicek Siklus 68-69/76.
Pola figma-shots-s84-run.py (CLI langsung + curl, maxDimension 4096)."""
import json, subprocess, sys

FRAMES = [("s85-home-mob-light", "1:2"),
          ("s85-home-mob-dark", "1:105"),
          ("s85-search-mlbb-light", "15:2"),
          ("s85-search-mlbb-dark", "15:105"),
          ("s85-search-zzz-light", "16:2"),
          ("s85-search-zzz-dark", "16:107"),
          ("s85-modal-sk-light", "10:2"),
          ("s85-modal-sk-dark", "10:105"),
          ("s85-modal-refund-light", "13:2"),
          ("s85-modal-refund-dark", "13:111"),
          ("s85-modal-masuk-light", "162:2"),
          ("s85-modal-masuk-dark", "162:111")]
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
