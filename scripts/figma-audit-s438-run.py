#!/usr/bin/env python3
"""Driver read-only s438: jalankan figma-audit-s438.js lewat use_figma per
rentang frame, gabungkan, simpan ke hidden_files/qa-periodic-s438/figma-audit-s438.json.
Pola sama seperti figma-qa-scan-run.py (2 rentang agar di bawah batas 48KB)."""
import json, subprocess, sys, os

BASE = "/home/hatch/workspace/rosdi-webstore"
with open(f"{BASE}/scripts/figma-audit-s438.js", encoding="utf-8") as f:
    template = f.read()

def scan(fr, to):
    code = template.replace("__FROM__", str(fr)).replace("__TO__", str(to))
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": f"Audit s438 read-only: teks/format/geometri frame {fr}-{to}",
        "code": code,
        "skillNames": "resource:figma-use",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    if r.returncode != 0:
        print("FIGMA CALL FAILED rc", r.returncode, file=sys.stderr)
        print(r.stdout[-2000:], file=sys.stderr)
        print(r.stderr[-2000:], file=sys.stderr)
        sys.exit(1)
    outer = json.loads(r.stdout)
    inner = json.loads(outer["result"]["content"][0]["text"])
    return inner

merged = {"frameCount": 0, "frames": [], "draft": [], "dblSpace": [], "rpSpace": [],
          "rpNoSep": [], "rpDecimal": [], "emptyText": [], "overflowRight": [],
          "genericNames": [], "frameNames": [], "sections": []}
for fr, to in [(0, 33), (33, 66), (66, 99), (99, 10000)]:
    inner = scan(fr, to)
    print(f"rentang {fr}-{to}: {inner['frameCount']} frame")
    if inner["frameCount"] == 0:
        break
    for k in merged:
        if k == "frameCount":
            merged[k] += inner[k]
        else:
            merged[k].extend(inner[k])

outdir = f"{BASE}/hidden_files/qa-periodic-s438"
os.makedirs(outdir, exist_ok=True)
with open(f"{outdir}/figma-audit-s438.json", "w", encoding="utf-8") as f:
    json.dump(merged, f, ensure_ascii=False, indent=1)
print("gabungan:", merged["frameCount"], "frame")
for k in ["draft", "dblSpace", "rpSpace", "rpNoSep", "rpDecimal", "emptyText", "overflowRight", "genericNames"]:
    print(k, len(merged[k]))
