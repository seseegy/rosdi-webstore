#!/usr/bin/env python3
"""Driver read-only s441: jalankan figma-s441a.js + figma-s441b.js lewat
use_figma; simpan dump ke hidden_files/qa-periodic-s441/."""
import json, subprocess, sys, os

BASE = "/home/hatch/workspace/rosdi-webstore"
OUT = BASE + "/hidden_files/qa-periodic-s441"
os.makedirs(OUT, exist_ok=True)

def call(code, desc):
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": desc,
        "code": code,
        "skillNames": "resource:figma-use",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    outer = json.loads(r.stdout)
    txt = outer["result"]["content"][0]["text"]
    if not txt.startswith("{"):
        raise RuntimeError("use_figma gagal: " + txt[:800])
    return json.loads(txt)

for name, desc in [
    ("figma-s441a.js", "QA s441a read-only: struktur, Variables, pola teks, font"),
    ("figma-s441b.js", "QA s441b read-only: geometri 8pt, input, tombol, veil, chip, CTA"),
]:
    with open(BASE + "/scripts/" + name, encoding="utf-8") as f:
        data = call(f.read(), desc)
    with open(OUT + "/" + name.replace(".js", ".json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(name, "OK — keys:", sorted(data.keys()))
print("SELESAI")
