#!/usr/bin/env python3
"""Driver read-only: jalankan figma-probe-s432{a,b,c}.js lewat use_figma,
simpan output ke qa-s432/probe-s432{a,b,c}.json. Pola figma-qa-scan-run.py."""
import json, subprocess, sys

QA = "/home/hatch/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/hidden_files/qa-s432"
SCRIPT_DIR = "/home/hatch/workspace/rosdi-webstore/scripts"

def run(suffix):
    with open(f"{SCRIPT_DIR}/figma-probe-s432{suffix}.js", encoding="utf-8") as f:
        code = f.read()
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": f"QA probe read-only batch s432{suffix} (Siklus 434)",
        "code": code,
        "skillNames": "resource:figma-use",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    outer = json.loads(r.stdout)
    inner = json.loads(outer["result"]["content"][0]["text"])
    with open(f"{QA}/probe-s432{suffix}.json", "w", encoding="utf-8") as f:
        json.dump(inner, f, ensure_ascii=False, indent=1)
    print(suffix, "OK, keys:", list(inner.keys()) if isinstance(inner, dict) else type(inner))

for s in sys.argv[1:] or ["a", "b", "c"]:
    run(s)
