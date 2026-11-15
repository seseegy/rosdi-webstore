#!/usr/bin/env python3
"""Driver Siklus 145: retry visual 6 frame GamePage lama DESKTOP yang terblokir
rate limit di Siklus 144 — PUBG 90:2/90:241, HoK 93:2/93:249, Roblox 95:2/95:241.
Pola figma-shots-s144-desk-run.py (CLI langsung + curl, maxDimension 4096).
Output ke hidden_files/qa-games-1c/ (kelanjutan folder Siklus 142-144)."""
import json, subprocess, sys, os

FRAMES = [("s145-pubg-desk-light", "90:2"),
          ("s145-pubg-desk-dark", "90:241"),
          ("s145-hok-desk-light", "93:2"),
          ("s145-hok-desk-dark", "93:249"),
          ("s145-roblox-desk-light", "95:2"),
          ("s145-roblox-desk-dark", "95:241")]
FILE_KEY = "CZf0aT00935jutZp7JbkYR"
OUTDIR = os.path.expanduser(
    "~/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/"
    "hidden_files/qa-games-1c")
os.makedirs(OUTDIR, exist_ok=True)
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
        print(label, "NO-URL", r.stdout[:400], file=sys.stderr)
        continue
    out = os.path.join(OUTDIR, f"{label}.png")
    c = subprocess.run(["curl", "-f", "-s", "-L", "-o", out, url],
                       capture_output=True, text=True, timeout=120)
    if c.returncode != 0:
        print(label, "CURL-FAIL", c.stderr[:200], file=sys.stderr)
        continue
    print(label, node_id, "->", out)
    ok += 1
print("OK:", ok, "/", len(FRAMES))
