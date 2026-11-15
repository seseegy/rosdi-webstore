#!/usr/bin/env python3
"""Driver Siklus 159: visual rotasi QA berkala — indeks mobile + Paket Data.
Indeks Pulsa/Data/E-Wallet mobile (54:22/54:90/54:158/54:226/54:288/54:338,
terakhir dicek Siklus 31) + Paket Data Telkomsel mobile (41:2/41:94) +
desktop (46:2/46:235) (terakhir Siklus 35).
Pola figma-shots-s158-run.py (CLI langsung + curl, maxDimension 4096).
Output ke hidden_files/qa-idx-data-s159/."""
import json, subprocess, sys, os

FRAMES = [
    ("s159-idx-pulsa-light", "54:22"),
    ("s159-idx-pulsa-dark", "54:90"),
    ("s159-idx-data-light", "54:158"),
    ("s159-idx-data-dark", "54:226"),
    ("s159-idx-emoney-light", "54:288"),
    ("s159-idx-emoney-dark", "54:338"),
    ("s159-data-mobile-light", "41:2"),
    ("s159-data-mobile-dark", "41:94"),
    ("s159-data-desktop-light", "46:2"),
    ("s159-data-desktop-dark", "46:235"),
]
FILE_KEY = "CZf0aT00935jutZp7JbkYR"
OUTDIR = os.path.expanduser(
    "~/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/"
    "hidden_files/qa-idx-data-s159")
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
