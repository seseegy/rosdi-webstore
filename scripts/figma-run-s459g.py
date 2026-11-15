#!/usr/bin/env python3
"""Driver read-only s459g: jalankan figma-probe-s459g.js via use_figma,
simpan hasilnya ke hidden_files/figma-s459g.json."""
import json, subprocess

code = open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s459g.js", encoding="utf-8").read()
args = {"fileKey": "CZf0aT00935jutZp7JbkYR", "description": "Probe read-only Figma batch s459 ide E59-E63",
        "code": code, "skillNames": "resource:figma-use"}
r = subprocess.run(["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
                    "--arguments-json", json.dumps(args, ensure_ascii=False)],
                   capture_output=True, text=True, timeout=300)
outer = json.loads(r.stdout)
inner = json.loads(outer["result"]["content"][0]["text"])
with open("/home/hatch/workspace/rosdi-webstore/hidden_files/figma-s459g.json", "w", encoding="utf-8") as f:
    json.dump(inner, f, ensure_ascii=False, indent=1)
print(json.dumps(inner, ensure_ascii=False)[:3000])
