#!/usr/bin/env python3
"""Driver read-only: jalankan figma-probe-s437b.js lewat use_figma, simpan ke /tmp/figma-s437b.json."""
import json, subprocess

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s437b.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe read-only batch s437b: frame Extra Bold + stroke 1.25/1.6 (Siklus 437)",
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
with open("/tmp/figma-s437b.json", "w", encoding="utf-8") as f:
    f.write(json.dumps(inner, ensure_ascii=False))
print("frames with EB/strokes:", inner["count"])
