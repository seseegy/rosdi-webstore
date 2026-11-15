#!/usr/bin/env python3
"""Driver read-only s445 bagian I: jalankan scripts/figma-audit-s445.js lewat
use_figma; simpan dump ke hidden_files/qa-periodic-s445/figma-s445.json."""
import json, os, subprocess

BASE = "/home/hatch/workspace/rosdi-webstore"
OUT = BASE + "/hidden_files/qa-periodic-s445"

def call(code, desc):
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": desc,
        "code": code,
        "skillNames": "resource:figma-use,resource:figma-generate-design",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    outer = json.loads(r.stdout)
    txt = outer["result"]["content"][0]["text"]
    if not txt.startswith("{"):
        raise RuntimeError("use_figma gagal: " + txt[:500])
    return json.loads(txt)

os.makedirs(OUT, exist_ok=True)
with open(BASE + "/scripts/figma-audit-s445.js", encoding="utf-8") as f:
    data = call(f.read(), "QA s445 read-only: duplikat/ALL-CAPS/pemisah/opacity/blend/divider/badge/was/countdown")
with open(OUT + "/figma-s445.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
print("frames:", data["frameCount"], "nodes:", data["totalNodes"], "teks:", data["totalTexts"])
print("duplikat:", data["duplicates"])
print("ALL CAPS:", data["caps"]["count"])
for c in data["caps"]["items"][:20]:
    print("  ", c)
print("pemisah:", data["sepCount"])
print("  pipe:", data["sepSamples"]["pipe"])
print("  bullet:", data["sepSamples"]["bullet"])
print("  dash:", data["sepSamples"]["dashSep"])
print("opacity<100%:", data["opacityLow"]["count"])
for o in data["opacityLow"]["items"][:20]:
    print("  ", o)
print("blend bukan Normal:", data["blendNonNormal"]["count"], data["blendNonNormal"]["items"][:10])
print("divider tak-selebar induk:", data["dividers"]["count"])
for d in data["dividers"]["items"][:20]:
    print("  ", d)
print("badge:", json.dumps(data["badges"], ensure_ascii=False, indent=1))
print("flash was:", json.dumps(data["flashWas"], ensure_ascii=False, indent=1))
print("countdown:", json.dumps(data["countdowns"], ensure_ascii=False))
