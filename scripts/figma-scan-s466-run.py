#!/usr/bin/env python3
"""Driver read-only s466: jalankan figma-scan-s466.js lewat use_figma, simpan ke /tmp/figma-s466.json."""
import json, subprocess

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-scan-s466.js", encoding="utf-8") as f:
    code = f.read()
args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "QA scan read-only s466: hitung kata Diamond/Diamonds/Garansi/Promo Kilat, frame E-Wallet Desktop 51:190, harga Genshin Desktop",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("RC:", r.returncode)
print("STDOUT:", r.stdout[:2000])
print("STDERR:", r.stderr[:2000])
outer = json.loads(r.stdout)
inner = json.loads(outer["result"]["content"][0]["text"])
with open("/tmp/figma-s466.json", "w", encoding="utf-8") as f:
    f.write(json.dumps(inner, ensure_ascii=False))
print("frameCount:", inner.get("frameCount"), "totals:", inner.get("totals"))
