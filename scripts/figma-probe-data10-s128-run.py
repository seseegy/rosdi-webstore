#!/usr/bin/env python3
"""Driver read-only Siklus 128: dump struktur 4 frame data (Light)."""
import json, subprocess, sys
with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-data10-s128.js", encoding="utf-8") as f:
    code = f.read()
args = {"fileKey": "CZf0aT00935jutZp7JbkYR", "description": "Probe struktur frame data 10 paket (read-only, Siklus 128)", "code": code, "skillNames": "resource:figma-use"}
r = subprocess.run(["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma", "--arguments-json", json.dumps(args, ensure_ascii=False)], capture_output=True, text=True, timeout=300)
outer = json.loads(r.stdout)
inner = json.loads(outer["result"]["content"][0]["text"])
with open("/tmp/probe-data10-s128.json", "w", encoding="utf-8") as f:
    json.dump(inner, f, ensure_ascii=False)
print(json.dumps(inner, ensure_ascii=False)[:3000])
print("--- tersimpan /tmp/probe-data10-s128.json ---")
print(r.stderr[-500:], file=sys.stderr)
