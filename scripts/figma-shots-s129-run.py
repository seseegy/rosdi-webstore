#!/usr/bin/env python3
"""Driver read-only: get_screenshot 8 frame indeks by.U (Siklus 129),
unduh PNG ke /tmp/shot-<label>.png."""
import json, subprocess

FRAMES = [
    ("idxpulsa-mobile-light", "54:22"),
    ("idxpulsa-mobile-dark", "54:90"),
    ("idxdata-mobile-light", "54:158"),
    ("idxdata-mobile-dark", "54:226"),
    ("idxpulsa-desk-light", "49:2"),
    ("idxpulsa-desk-dark", "49:96"),
    ("idxdata-desk-light", "51:2"),
    ("idxdata-desk-dark", "51:96"),
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
