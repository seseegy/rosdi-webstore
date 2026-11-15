#!/usr/bin/env python3
"""Driver read-only s439: jalankan figma-scan-s439.js (paritas pasangan
Light/Dark) + figma-patterns-s439.js (pola teks, slice per 45 frame) lewat
use_figma; simpan dump ke hidden_files/qa-periodic-s439/."""
import json, subprocess, sys

BASE = "/home/hatch/workspace/rosdi-webstore"
OUT = BASE + "/hidden_files/qa-periodic-s439"

def call(code, desc):
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": desc,
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
        raise RuntimeError("use_figma gagal: " + txt[:500])
    inner = json.loads(txt)
    return inner

with open(BASE + "/scripts/figma-scan-s439.js", encoding="utf-8") as f:
    pairs = call(f.read(), "QA s439 read-only: paritas pasangan Light/Dark")
with open(OUT + "/figma-pairs-s439.json", "w", encoding="utf-8") as f:
    json.dump(pairs, f, ensure_ascii=False)
print("pairs:", pairs["frameCount"], "frame,", pairs["pairCount"], "pasangan,",
      pairs["totalNodes"], "node,", pairs["totalTexts"], "teks")

with open(BASE + "/scripts/figma-patterns-s439.js", encoding="utf-8") as f:
    template = f.read()
all_hits = []
for fr, to in [(0, 45), (45, 90), (90, 10000)]:
    code = template.replace("__FROM__", str(fr)).replace("__TO__", str(to))
    inner = call(code, f"QA s439 read-only: pola teks frame {fr}-{to}")
    all_hits.extend(inner["hits"])
    print(f"pola {fr}-{to}: {inner['frameCount']} frame, {inner['hitCount']} hits")
    if inner["frameCount"] == 0:
        break
with open(OUT + "/figma-patterns-s439.json", "w", encoding="utf-8") as f:
    json.dump({"hitCount": len(all_hits), "hits": all_hits}, f, ensure_ascii=False)
print("pola gabungan:", len(all_hits), "hits")
