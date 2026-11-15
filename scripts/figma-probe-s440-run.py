#!/usr/bin/env python3
"""Driver read-only s440: jalankan figma-probe-s440a.js dan -s440b.js lewat
use_figma; simpan dump ke hidden_files/qa-periodic-s440/."""
import json, os, subprocess, sys

BASE = "/home/hatch/workspace/rosdi-webstore"
OUT = BASE + "/hidden_files/qa-periodic-s440"
os.makedirs(OUT, exist_ok=True)

def call(path, desc):
    with open(path, encoding="utf-8") as f:
        code = f.read()
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

for part, path in [("a", BASE + "/scripts/figma-probe-s440a.js"),
                   ("b", BASE + "/scripts/figma-probe-s440b.js")]:
    inner = call(path, "QA s440 read-only bagian " + part.upper())
    with open(f"{OUT}/figma-patterns-s440{part}.json", "w", encoding="utf-8") as f:
        json.dump(inner, f, ensure_ascii=False, indent=1)
    print(f"bagian {part}: frames={inner.get('frameCount')}")
    for k, v in inner["patterns"].items():
        print(f"  {k}: {v['count']}")
    if inner.get("emptyGeom"):
        print("  emptyGeom:", json.dumps(inner["emptyGeom"], ensure_ascii=False))
