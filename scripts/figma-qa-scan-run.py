#!/usr/bin/env python3
"""Driver read-only: jalankan figma-qa-scan.js lewat use_figma, simpan output ke /tmp/qa-scan18.json.

Siklus 204: 116 frame = 48.439 byte > batas return use_figma 48.000 byte,
jadi scan dijalankan 2x per rentang frame (0-58, 58-116) lalu dump
digabungkan — format gabungan sama persis dengan dump sekali jalan.
"""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-qa-scan.js", encoding="utf-8") as f:
    template = f.read()

def scan(fr, to):
    code = template.replace("__FROM__", str(fr)).replace("__TO__", str(to))
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": f"QA scan read-only: dump teks Rp frame {fr}-{to} (Siklus 428)",
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
    return inner

all_frames = []
total = 0
for fr, to in [(0, 58), (58, 10000)]:
    inner = scan(fr, to)
    all_frames.extend(inner["frames"])
    total += inner["totalRpTexts"]
    print(f"rentang {fr}-{to}: {inner['frameCount']} frame, {inner['totalRpTexts']} teks Rp")
    if inner["frameCount"] == 0:
        break

merged = {"frameCount": len(all_frames), "totalRpTexts": total, "frames": all_frames}
# Bungkus seperti output mentah use_figma agar check-figma-prices.mjs tak berubah.
wrapped = {"ok": True, "result": {"content": [{"text": json.dumps(merged)}]}}
with open("/tmp/qa-scan18.json", "w", encoding="utf-8") as f:
    f.write(json.dumps(wrapped))
print("gabungan:", len(all_frames), "frame,", total, "teks Rp")
