# -*- coding: utf-8 -*-
"""打包离线版：python tools/pack.py [版本号]

产出两份（内容一致，只是文件名不同）：
  downloads/sparklab-offline-vX.Y.Z.zip        —— 站点内供下载，入 git
  星火物理实验室-离线版-vX.Y.Z.zip              —— 根目录归档，不入 git

打包内容：index.html + assets/ + data/ + tests/ + tools/build_icons.py
排除：reference/、downloads/、.workbuddy/、临时产物、上一版 zip
"""
import os
import sys
import re
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND_FILE = "星火物理实验室-离线版-v%s.zip"
SITE_FILE = os.path.join("downloads", "sparklab-offline-v%s.zip")

INCLUDE_DIRS = ["assets", "data", "tests"]
INCLUDE_FILES = ["index.html", os.path.join("tools", "build_icons.py")]
SKIP_EXT = {".zip", ".pyc"}
SKIP_DIR = {".git", ".workbuddy", "reference", "downloads", "node_modules",
            "__pycache__", ".tmpedge", ".shots", ".screenshots"}


def version():
    if len(sys.argv) > 1:
        return sys.argv[1]
    p = os.path.join(ROOT, "assets", "js", "core", "utils.js")
    with open(p, encoding="utf-8") as f:
        m = re.search(r"SL\.VERSION\s*=\s*'([^']+)'", f.read())
    if not m:
        raise SystemExit("找不到 SL.VERSION")
    return m.group(1)


def collect():
    out = []
    for name in INCLUDE_FILES:
        p = os.path.join(ROOT, name)
        if os.path.isfile(p):
            out.append(name)
        else:
            print("! 缺少文件:", name)
    for d in INCLUDE_DIRS:
        base = os.path.join(ROOT, d)
        if not os.path.isdir(base):
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [x for x in dirnames if x not in SKIP_DIR and not x.startswith(".tmp")]
            for fn in sorted(filenames):
                if os.path.splitext(fn)[1].lower() in SKIP_EXT:
                    continue
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, ROOT).replace("\\", "/")
                out.append(rel)
    return sorted(set(out))


def build(ver):
    files = collect()
    top = "星火物理实验室-离线版-v%s" % ver
    targets = [os.path.join(ROOT, SITE_FILE % ver), os.path.join(ROOT, BRAND_FILE % ver)]
    for tgt in targets:
        parent = os.path.dirname(tgt)
        if parent and not os.path.isdir(parent):
            os.makedirs(parent)
        with zipfile.ZipFile(tgt, "w", zipfile.ZIP_DEFLATED) as z:
            for rel in files:
                z.write(os.path.join(ROOT, rel), top + "/" + rel)
        print("%-58s %8.1f KB" % (os.path.relpath(tgt, ROOT), os.path.getsize(tgt) / 1024.0))
    print("共 %d 个文件，版本 v%s" % (len(files), ver))

    # 清掉上一版的站点内包，避免 downloads 里堆积
    dl = os.path.join(ROOT, "downloads")
    keep = os.path.basename(targets[0])
    for fn in os.listdir(dl):
        if fn.startswith("sparklab-offline-") and fn.endswith(".zip") and fn != keep:
            os.remove(os.path.join(dl, fn))
            print("已删除旧包:", fn)


if __name__ == "__main__":
    build(version())
