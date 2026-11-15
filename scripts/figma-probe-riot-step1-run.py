#!/usr/bin/env python3
"""Driver read-only: probe Langkah 1 di 4 frame Valorant + Wild Rift (Siklus 137)."""
import json, subprocess

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-riot-step1.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe read-only Langkah 1 Valorant + Wild Rift (Siklus 137)",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print(r.stdout[-12000:])
print(r.stderr[-2000:], file=__import__("sys").stderr)
