#!/usr/bin/env python3
"""Driver read-only s459h: jalankan figma-probe-s459h.js via use_figma,
simpan hasilnya ke hidden_files/figma-s459h.json."""
import json, subprocess

code = open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s459h.js", encoding="utf-8").read()
args = {"fileKey": "CZf0aT00935jutZp7JbkYR", "description": "Diagnostik struktur Figma batch s459",
        "code": code, "skillNames": "resource:figma-use"}
r = subprocess.run(["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
                    "--arguments-json", json.dumps(args, ensure_ascii=False)],
                   capture_output=True, text=True, timeout=300)
outer = json.loads(r.stdout)
inner = json.loads(outer["result"]["content"][0]["text"])
with open("/home/hatch/workspace/rosdi-webstore/hidden_files/figma-s459h.json", "w", encoding="utf-8") as f:
    json.dump(inner, f, ensure_ascii=False, indent=1)
print(json.dumps(inner, ensure_ascii=False)[:4000])
