#!/usr/bin/env python3
"""Driver s464e: jalankan figma-probe-s464e.js lewat use_figma (read-only). Simpan stdout penuh."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s464e.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe isi frame Produk Game mobile + lokasi teks HoK/Valorant/Roblox (s464 E57/E65/E66)",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=180,
)
with open("/home/hatch/workspace/rosdi-webstore/hidden_files/figma-s464e-raw.json", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stderr[-1000:], file=sys.stderr)
