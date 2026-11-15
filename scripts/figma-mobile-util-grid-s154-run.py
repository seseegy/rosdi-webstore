#!/usr/bin/env python3
"""Driver: jalankan figma-mobile-util-grid-s154.js lewat use_figma (Siklus 154, mutasi)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-util-grid-s154.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 154 fix: grid util Beranda Mobile 1:2 + 1:105 dan latar modal 10:2 10:105 13:2 13:111 sinkron ke Home.jsx (kartu Tagihan + urutan voucher/e-wallet + sub Pulsa by.U)",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-48000:])
print(r.stderr[-1000:], file=sys.stderr)
