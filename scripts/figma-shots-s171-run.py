#!/usr/bin/env python3
"""Driver Siklus 171: retry visual 4 frame indeks mobile yang tertahan limit
di Siklus 170 — Data Light/Dark, E-Wallet Light/Dark.
Pola figma-shots-s170-run.py (CLI langsung + curl, maxDimension 4096).
Screenshot DIDAHULUKAN sebelum scan/probe (fokus Siklus 170) — bila limit
menutup, frame yang tertahan dicatat, bukan lolos.
Output ke hidden_files/qa-idx-mobile-s171/."""
import json, subprocess, sys, os

FRAMES = [
    ("s171-idx-data-light", "54:158"),
    ("s171-idx-data-dark", "54:226"),
    ("s171-idx-emoney-light", "54:288"),
    ("s171-idx-emoney-dark", "54:338"),
]
FILE_KEY = "CZf0aT00935jutZp7JbkYR"
OUTDIR = os.path.expanduser(
    "~/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/"
    "hidden_files/qa-idx-mobile-s171")
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
