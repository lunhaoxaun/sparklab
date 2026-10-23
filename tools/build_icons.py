"""开发期脚本：把 assets/icons/raw/*.svg 转成内联图标表 assets/icons/sprite.js
运行：python tools/build_icons.py
说明：最终交付物不依赖 Python；本脚本只在新增/更新图标时执行。
"""
import datetime
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets", "icons", "raw")
OUT = os.path.join(ROOT, "assets", "icons", "sprite.js")
LICENSE = os.path.join(ROOT, "assets", "icons", "LICENSE")


def inner_svg(source: str) -> str:
    cleaned = re.sub(r"<!--[\s\S]*?-->", "", source)
    match = re.search(r"<svg[^>]*>([\s\S]*?)</svg>", cleaned, re.I)
    if not match:
        raise ValueError("无法解析 SVG：缺少 <svg> 标签")
    return re.sub(r">\s+<", "><", match.group(1)).strip()


icons = {}
entries = []
for name in sorted(os.listdir(RAW)):
    if not name.endswith(".svg"):
        continue
    key = name[:-4]
    source = open(os.path.join(RAW, name), encoding="utf-8").read()
    version_match = re.search(r'version:\s*"([^"]+)"', source)
    icons[key] = inner_svg(source)
    entries.append((key, version_match.group(1) if version_match else "unknown"))

generated_at = datetime.datetime.now().isoformat(timespec="seconds")
lines = [
    "/* 自动生成，请勿手改。源：Tabler Icons (MIT) https://github.com/tabler/tabler-icons */",
    "/* 生成时间：" + generated_at + "；重新生成：python tools/build_icons.py */",
    "window.SparkLab = window.SparkLab || {};",
    "window.SparkLab.icons = {",
]
for key, markup in icons.items():
    lines.append("  " + json.dumps(key, ensure_ascii=False) + ": " + json.dumps(markup, ensure_ascii=False) + ",")
lines.append("};")
lines.append("")
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))

with open(os.path.join(ROOT, "assets", "icons", "Tabler-LICENSE.txt"), encoding="utf-8") as fh:
    license_text = fh.read().strip()

doc = [
    "# 图标素材来源与许可",
    "",
    "图标库：Tabler Icons — https://github.com/tabler/tabler-icons",
    "许可：MIT License（全文见下方）",
    "获取日期：2026-10-22",
    "获取方式：raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/<name>.svg",
    "版本说明：以下版本号取自各 SVG 文件头部的 version 字段。",
    "",
    "## 图标清单",
    "",
]
for key, version in entries:
    doc.append(
        "- `{}` — Tabler Icons v{} — https://github.com/tabler/tabler-icons/blob/main/icons/outline/{}.svg".format(
            key, version, key
        )
    )
doc += [
    "",
    "## 自绘素材（不在上表，无第三方版权）",
    "",
    "- 滑动变阻器、单刀开关、导线接头、电流方向箭头、灯泡光晕：由本项目按教材标准画法自绘。",
    "",
    "## MIT License 全文",
    "",
    "```text",
    license_text,
    "```",
    "",
]
with open(LICENSE, "w", encoding="utf-8") as fh:
    fh.write("\n".join(doc))

print("已生成 {} 个图标 → assets/icons/sprite.js".format(len(icons)))
print("许可与来源清单 → assets/icons/LICENSE")
