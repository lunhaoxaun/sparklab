# -*- coding: utf-8 -*-
"""全站回归：python tools/run_tests.py [页面名 ...] [--file]

跑 tests/ 下所有自测页，读 document.title 判定通过与否。

  python tools/run_tests.py                      # 默认 15 页，走 http://127.0.0.1:8901
  python tools/run_tests.py math-test.html       # 只跑指定页
  python tools/run_tests.py --file math-test.html  # 走 file:// 绝对路径（断网场景）
  python tools/run_tests.py -v math-test.html    # 同时打印每页 PASS 行

判定：`PASS n/m` / `DONE` / `ALL PASS` 通过；`FAIL…`、空标题、超时失败。
单页 15s 超时，最多重试 1 次。任一页失败仍跑完剩余页面，末尾给出
`ALL PAGES OK` 或 `FAILED PAGES: n`，退出码 0 / 1。

为什么不再用 `msedge --headless --dump-dom`：本机 Edge 的 GUI 会话在跑时，
命令行 headless 会把请求交给已有实例，`--dump-dom` 直接返回空（连空白页都是
0 字节），`--headless=old/new` 均如此。改用 playwright 驱动同一个 msedge
二进制，拿到的就是真实渲染后的 DOM 与 document.title。
"""

import glob
import functools
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TESTS = ROOT / "tests"
PORT = 8901
PAGE_TIMEOUT = 15000          # 单页超时（毫秒）
RETRIES = 1                   # 超时/无标题时最多重试次数（总共跑 1 + RETRIES 次）
DEFAULT_PAGES = [
    "circuit-test.html", "board-test.html", "lab-test.html",
    "records-test.html", "formula-test.html", "chem-test.html", "bio-test.html",
    "thermo-test.html", "optics-test.html", "physics-test.html", "bench-test.html",
    "rigid-test.html", "sim-test.html", "math-test.html", "ui-test.html",
]
DONE_TITLE = re.compile(r"^(PASS\b|DONE\b|ALL\s+PASS)", re.I)
BAD_TITLE = re.compile(r"^(FAIL|NO\s+TITLE)", re.I)


# ---------------------------------------------------------------- 解释器自举
def _candidate_pythons():
    """找出可能装了 playwright 的解释器（默认 python 可能没有）。"""
    seen = set()

    def push(p):
        if not p:
            return
        p = os.path.normpath(p)
        if p and p not in seen and os.path.isfile(p):
            seen.add(p)
            return p
        return None

    env = os.environ.get("SPARKLAB_PY")
    if push(env):
        yield env
    if push(sys.executable):
        yield sys.executable

    patterns = [
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python3*\python.exe"),
        os.path.expandvars(r"%ProgramFiles%\Python3*\python.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Python3*\python.exe"),
        r"C:\Python3*\python.exe",
    ]
    for pat in patterns:
        for p in sorted(glob.glob(pat), reverse=True):
            if push(p):
                yield p

    # py 启动器（Windows）
    try:
        out = os.popen('py -0p 2>nul').read()
        for m in re.finditer(r"([A-Za-z]:\\.*?python\.exe)", out):
            if push(m.group(1)):
                yield m.group(1)
    except Exception:
        pass


def _can_import_playwright(py):
    try:
        r = subprocess.run([py, "-c", "import playwright"],
                           capture_output=True, timeout=60)
        return r.returncode == 0
    except Exception:
        return False


def _bootstrap_playwright():
    """当前解释器没有 playwright 时，换一个能 import 的解释器重跑本脚本。"""
    print("# 当前解释器缺少 playwright，正在查找可用的 Python …", flush=True)
    for py in _candidate_pythons():
        if os.path.normpath(py) == os.path.normpath(sys.executable):
            continue
        if _can_import_playwright(py):
            print("# 切换到：%s" % py, flush=True)
            env = dict(os.environ)
            env["SPARKLAB_BOOTSTRAPPED"] = "1"
            rc = subprocess.call([py, os.path.abspath(__file__)] + sys.argv[1:], env=env)
            sys.exit(rc)
    print("! 找不到装了 playwright 的 Python。请用装了 playwright 的解释器运行，"
          "或设置环境变量 SPARKLAB_PY 指向它。", flush=True)
    sys.exit(1)


# ---------------------------------------------------------------- 静态服务
class _QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        # 回归页要保证每次都是新脚本
        self.send_header("Cache-Control", "no-store")
        SimpleHTTPRequestHandler.end_headers(self)


def _start_server():
    """在后台线程起 127.0.0.1:8901；端口被占则顺延。"""
    for port in range(PORT, PORT + 60):
        try:
            httpd = ThreadingHTTPServer(
                ("127.0.0.1", port), functools.partial(_QuietHandler, directory=str(ROOT)))
        except OSError:
            continue
        httpd.daemon_threads = True
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        return httpd, "http://127.0.0.1:%d" % port
    raise SystemExit("! 8901~8960 端口全部被占用")


# ---------------------------------------------------------------- 判定
def _read_report(page):
    """取标题 + #out 里的 PASS/FAIL 行与合计行。"""
    try:
        title = (page.title() or "").strip()
    except Exception:
        title = ""
    body = ""
    try:
        body = page.evaluate(
            "() => { var e = document.getElementById('out');"
            " return e ? (e.innerText || e.textContent || '') : ''; }") or ""
    except Exception:
        body = ""
    bad = []
    passed = []
    total_line = ""
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("FAIL"):
            bad.append(line[:200])
        elif line.startswith("PASS"):
            passed.append(line[:200])
        elif "合计" in line:
            total_line = line
    return title, bad, total_line, passed


def _verdict(title):
    t = (title or "").strip()
    if not t:
        return False, "no title"
    if DONE_TITLE.match(t):
        return True, ""
    if BAD_TITLE.match(t):
        return False, "fail"
    return False, "no title"


def _run_page(browser, url, page_name):
    """跑一页（含重试），返回 (title, bad_lines, total_line, passed_lines, ok)。"""
    title, bad, total_line, passed = "", [], "", []
    for attempt in range(RETRIES + 1):
        ctx = browser.new_context(viewport={"width": 1500, "height": 1000})
        page = ctx.new_page()
        try:
            page.goto(url, wait_until="load", timeout=PAGE_TIMEOUT)
            deadline = time.time() + PAGE_TIMEOUT / 1000.0
            while time.time() < deadline:
                title, bad, total_line, passed = _read_report(page)
                if _verdict(title)[0] or BAD_TITLE.match(title or ""):
                    break
                page.wait_for_timeout(120)
            title, bad, total_line, passed = _read_report(page)
        except Exception as exc:                      # 加载失败 / 超时
            msg = str(exc).splitlines()[0] if str(exc) else exc.__class__.__name__
            title, bad, total_line, passed = "", ["加载失败：" + msg[:160]], "", []
        finally:
            try:
                ctx.close()
            except Exception:
                pass

        ok, why = _verdict(title)
        if ok:
            return title, bad, total_line, passed, True
        if why == "fail":                            # 真失败不重试
            return title, bad, total_line, passed, False
        if attempt < RETRIES:
            time.sleep(0.2)
    return title, bad, total_line, passed, False


# ---------------------------------------------------------------- 主流程
def main(argv):
    use_file = False
    verbose = False
    pages = []
    for a in argv:
        if a in ("--file", "-f"):
            use_file = True
        elif a in ("-v", "--verbose"):
            verbose = True
        elif a in ("-h", "--help"):
            print(__doc__)
            return 0
        else:
            # 允许 `math-test`、`math-test.html`、`tests/math-test.html` 三种写法
            name = a.replace("\\", "/").rstrip("/")
            name = name.split("/")[-1]
            pages.append(name if name.endswith(".html") else name + ".html")
    pages = pages or list(DEFAULT_PAGES)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        if os.environ.get("SPARKLAB_BOOTSTRAPPED"):
            print("! 换了解释器仍然 import 不到 playwright。", flush=True)
            return 1
        _bootstrap_playwright()          # 不会返回

    httpd, origin = (None, "")
    if use_file:
        base = TESTS.as_uri() + "/"
    else:
        httpd, origin = _start_server()
        base = origin + "/tests/"

    work = Path(tempfile.gettempdir()) / "sparklab-tests"
    shutil.rmtree(work, ignore_errors=True)

    failed = []
    t0 = time.time()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                channel="msedge",
                headless=True,
                args=["--disable-gpu", "--no-first-run",
                      "--no-default-browser-check",
                      "--allow-file-access-from-files"],
            )
            try:
                for name in pages:
                    url = base + name
                    title, bad, total_line, passed, ok = _run_page(browser, url, name)
                    print("%-22s %-16s %s" % (name, title or "(no title)", total_line), flush=True)
                    if verbose:
                        for p in passed:
                            print("    ", p, flush=True)
                    for b in bad:
                        print("    ", b, flush=True)
                    if not ok:
                        failed.append(name)
            finally:
                browser.close()
    finally:
        if httpd is not None:
            httpd.shutdown()
            httpd.server_close()
        shutil.rmtree(work, ignore_errors=True)
        shutil.rmtree(ROOT / "tools" / ".tmpedge", ignore_errors=True)

    print("-" * 56)
    print("%d 页 / %.1fs" % (len(pages), time.time() - t0))
    if failed:
        print("FAILED PAGES: %d" % len(failed))
        for f in failed:
            print("   -", f)
        return 1
    print("ALL PAGES OK")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
