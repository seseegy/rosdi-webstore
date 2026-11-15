#!/usr/bin/env python3
"""Driver s464c: jalankan figma-probe-s464c.js lewat use_figma (read-only). Simpan stdout penuh."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s464c.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe node/teks Pulsa Telkomsel, Saldo DANA, Voucher GP, Modal S&K Desktop (s464 E56/E62-E64)",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=180,
)
with open("/home/hatch/workspace/rosdi-webstore/hidden_files/figma-s464c-raw.json", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stderr[-1000:], file=sys.stderr)
