#!/usr/bin/env python3
"""Driver read-only s440 bagian D (teks biaya mobile + varian kapital)."""
import json, os, subprocess

BASE = "/home/hatch/workspace/rosdi-webstore"
OUT = BASE + "/hidden_files/qa-periodic-s440"
with open(BASE + "/scripts/figma-probe-s440d.js", encoding="utf-8") as f:
    code = f.read()
args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "QA s440 read-only bagian D: teks biaya mobile + varian kapital akronim",
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
inner = json.loads(txt)
with open(OUT + "/figma-patterns-s440d.json", "w", encoding="utf-8") as f:
    json.dump(inner, f, ensure_ascii=False, indent=1)
print("mobileBiaya:", len(inner["mobileBiaya"]))
print("biayaPembayaran:", inner["biayaPembayaran"])
print("caseVar:", {k: v["count"] for k, v in inner["caseVar"].items()})
print("tanpaBiaya frames:", len(inner["tanpaBiayaFrames"]))
