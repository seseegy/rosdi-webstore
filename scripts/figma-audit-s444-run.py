#!/usr/bin/env python3
"""Driver read-only s444: jalankan scripts/figma-audit-s444.js lewat
use_figma; simpan dump ke hidden_files/qa-periodic-s444/figma-s444.json."""
import json, subprocess, sys

BASE = "/home/hatch/workspace/rosdi-webstore"
OUT = BASE + "/hidden_files/qa-periodic-s444"

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

import os
os.makedirs(OUT, exist_ok=True)
with open(BASE + "/scripts/figma-audit-s444.js", encoding="utf-8") as f:
    data = call(f.read(), "QA s444 read-only: audit frame/font/warna/radius/gap/Rp")
with open(OUT + "/figma-s444.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
print("frames:", data["frameCount"], "nodes:", data["totalNodes"], "teks:", data["totalTexts"])
print("duplikat:", data["duplicates"])
print("tanpa sufiks tema:", data["noThemeSuffix"])
print("yatim:", data["orphans"])
print("pasangan:", data["pairCount"], "dimensi beda:", data["dimMismatch"])
print("font:", data["fonts"])
print("warna di luar token:", data["offTokenCount"], data["offToken"][:12])
print("clip off:", data["clipsOffCount"], data["clipsOff"][:10])
print("radius:", data["radiusDist"])
print("grid (5 pertama):", json.dumps(data["grids"][:5], ensure_ascii=False))
print("Rp spasi:", data["rpSpace"])
print("Mulai Rp:", len(data["mulaiRp"]))
print("superlatif:", data["superlatif"])
