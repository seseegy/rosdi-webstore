#!/usr/bin/env python3
"""Screenshot SEMUA frame file Figma Rosdi Store -> folder + zip.

Dipakai untuk kirim SS semua desain ke Mas (permintaan 11 Nov 2026).
Daftar frame dibaca dari /tmp/frames-list.json (output figma-list-frames-run.py).
"""
import json, re, subprocess, sys, os, time

OUT_DIR = "/home/hatch/workspace/your_files/ss-rosdi-store"
FILE_KEY = "CZf0aT00935jutZp7JbkYR"
os.makedirs(OUT_DIR, exist_ok=True)

raw = open("/tmp/frames-list.json", encoding="utf-8").read()
outer = json.loads(raw)
data = None
for entry in outer["result"]["content"]:
    if entry.get("type") == "text" and '"frames"' in entry.get("text", ""):
        data = json.loads(entry["text"])
        break
frames = data["frames"]
print("total frames:", len(frames), flush=True)

def slug(name):
    s = name.replace("—", "-").replace("“", "").replace("”", "")
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-")
    return s

ok, fail = 0, []
for i, fr in enumerate(frames, 1):
    fname = f"{i:02d}-{slug(fr['name'])}.png"
    out = os.path.join(OUT_DIR, fname)
    if os.path.exists(out) and os.path.getsize(out) > 1000:
        print(i, "SKIP (ada)", fname, flush=True)
        ok += 1
        continue
    args = {"fileKey": FILE_KEY, "nodeId": fr["id"], "maxDimension": 1600}
    url = None
    for attempt in range(3):
        try:
            r = subprocess.run(
                ["/opt/hatch/bin/figma", "call-tool", "--name", "get_screenshot",
                 "--arguments-json", json.dumps(args)],
                capture_output=True, text=True, timeout=180)
            o = json.loads(r.stdout)
            for entry in o["result"]["content"]:
                if entry.get("type") == "text" and "image_url" in entry.get("text", ""):
                    url = json.loads(entry["text"])["image_url"]
                    break
        except Exception as e:
            print(i, "FAIL call", fr["id"], e, flush=True)
        if url:
            break
        time.sleep(5 * (attempt + 1))
    time.sleep(2)
    if not url:
        fail.append((i, fr["id"], fr["name"]))
        print(i, "NO-URL", fr["id"], fr["name"], flush=True)
        continue
    c = subprocess.run(["curl", "-f", "-s", "-L", "-o", out, url],
                       capture_output=True, text=True, timeout=120)
    if c.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) < 1000:
        fail.append((i, fr["id"], fr["name"]))
        print(i, "CURL-FAIL", fr["id"], flush=True)
        continue
    ok += 1
    print(i, "OK", fname, os.path.getsize(out), flush=True)

print("DONE ok:", ok, "fail:", len(fail), fail, flush=True)
