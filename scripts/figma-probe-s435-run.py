#!/usr/bin/env python3
"""Driver read-only s435: inventaris frame + nama node/auto-layout per frame.
Simpan ke qa-s435/. Argumen: list | frame:<label>:<id> ..."""
import json, subprocess, sys, os

QA = "/home/hatch/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/hidden_files/qa-s435"
os.makedirs(QA, exist_ok=True)
SCRIPT_DIR = "/home/hatch/workspace/rosdi-webstore/scripts"
TPL = open(f"{SCRIPT_DIR}/figma-probe-s435.js", encoding="utf-8").read()

def run(label, mode, fid):
    code = TPL.replace("__MODE__", mode).replace("__FID__", fid)
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": f"QA probe read-only batch s435 {label}",
        "code": code,
        "skillNames": "resource:figma-use,resource:figma-generate-design",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    outer = json.loads(r.stdout)
    inner = json.loads(outer["result"]["content"][0]["text"])
    if isinstance(inner, dict) and "error" in inner:
        print(label, "ERROR", inner["error"]); return
    with open(f"{QA}/{label}.json", "w", encoding="utf-8") as f:
        json.dump(inner, f, ensure_ascii=False, indent=1)
    print(label, "OK", str(inner)[:200])

if sys.argv[1] == "list":
    run("inventory", "list", "")
else:
    for spec in sys.argv[1:]:
        _, label, fid = spec.split(":", 2)
        run(label, "frame", fid)
