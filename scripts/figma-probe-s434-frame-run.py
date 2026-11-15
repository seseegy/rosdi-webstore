#!/usr/bin/env python3
"""Driver read-only: satu frame per panggilan use_figma (limit 48KB/call).
Simpan ke qa-s434/frame-<label>.json. Argumen: label:id ..."""
import json, subprocess, sys

QA = "/home/hatch/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/hidden_files/qa-s434"
SCRIPT_DIR = "/home/hatch/workspace/rosdi-webstore/scripts"
TPL = open(f"{SCRIPT_DIR}/figma-probe-s434-frame.js", encoding="utf-8").read()

def run(label, fid):
    code = TPL.replace("__FID__", fid)
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": f"QA probe read-only batch s434 frame {label} ({fid})",
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
    with open(f"{QA}/frame-{label}.json", "w", encoding="utf-8") as f:
        json.dump(inner, f, ensure_ascii=False, indent=1)
    print(label, "OK", inner.get("nTexts"), "teks")

for spec in sys.argv[1:]:
    label, fid = spec.split(":", 1)
    run(label, fid)
