#!/usr/bin/env python3
"""Driver Siklus 177: QA visual ulang 4 frame Pencarian mobile — kelompok
paling lama tak dicek ulang (terakhir Siklus 96, 15:47 WIB): Pencarian "mlbb"
Light+Dark dan Pencarian "zzz" Light+Dark. Pola driver siklus sebelumnya
(CLI figma langsung + curl, maxDimension 4096). Output ke
hidden_files/qa-search-mobile-s177/ di workspace goal."""
import json, subprocess, sys, os

FRAMES = [
    ("s177-search-mlbb-light", "15:2"),
    ("s177-search-mlbb-dark", "15:105"),
    ("s177-search-zzz-light", "16:2"),
    ("s177-search-zzz-dark", "16:107"),
]
FILE_KEY = "CZf0aT00935jutZp7JbkYR"
OUTDIR = os.path.expanduser(
    "~/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/"
    "hidden_files/qa-search-mobile-s177")
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
