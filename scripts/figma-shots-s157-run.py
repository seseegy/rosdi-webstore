#!/usr/bin/env python3
"""Driver Siklus 157: retry visual 4 frame modal pasca-repair baris 1
(S&K 10:2/10:105, Refund 13:2/13:111) — Beranda Light/Dark sudah lolos di S156.
Pola figma-shots-s156-run.py (CLI langsung + curl, maxDimension 4096).
Output ke hidden_files/qa-home-s157/."""
import json, subprocess, sys, os

FRAMES = [
    ("s157-modal-sk-light", "10:2"),
    ("s157-modal-sk-dark", "10:105"),
    ("s157-modal-refund-light", "13:2"),
    ("s157-modal-refund-dark", "13:111"),
]
FILE_KEY = "CZf0aT00935jutZp7JbkYR"
OUTDIR = os.path.expanduser(
    "~/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/"
    "hidden_files/qa-home-s157")
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
