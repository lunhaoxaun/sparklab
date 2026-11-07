import subprocess, sys, re, os, tempfile, shutil

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE = "http://127.0.0.1:8901/tests/"
pages = sys.argv[1:] or ["circuit-test.html", "board-test.html", "lab-test.html",
                         "records-test.html", "formula-test.html", "chem-test.html", "bio-test.html",
                         "thermo-test.html", "optics-test.html", "physics-test.html", "bench-test.html",
                         "rigid-test.html", "sim-test.html", "math-test.html", "ui-test.html"]
WORK = os.path.join(tempfile.gettempdir(), "sparklab-tests")
ATTEMPTS = 3   # 无头浏览器偶尔在脚本没下完时就 dump（表现为 SL.xxx undefined），重试即可


def text(html):
    html = re.sub(r"<br\s*/?>", "\n", html)
    html = re.sub(r"</(div|span|p|li)>", "\n", html)
    return re.sub(r"<[^>]+>", "", html)


def run(page, attempt):
    prof = os.path.join(WORK, page.replace(".html", "") + "-" + str(os.getpid()) + "-" + str(attempt))
    shutil.rmtree(prof, ignore_errors=True)
    out = subprocess.run([
        EDGE, "--headless", "--disable-gpu", "--no-first-run",
        "--user-data-dir=" + prof, "--virtual-time-budget=15000",
        "--dump-dom", BASE + page
    ], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return out.stdout or ""


def parse(dom):
    m = re.search(r"<title>(.*?)</title>", dom, re.S)
    title = m.group(1).strip() if m else "(no title)"
    bad = []
    total_line = ""
    for row in re.findall(r'<div class="row fail">(.*?)</div>', dom, re.S):
        bad.append(re.sub(r"<[^>]+>", " ", row).strip()[:200])
    if title.startswith("DONE") or title.startswith("FAIL"):
        m2 = re.search(r'<div id="out">(.*?)</div>', dom, re.S)
        body = text(m2.group(1)) if m2 else ""
        for line in body.split("\n"):
            line = line.strip()
            if line.startswith("FAIL"):
                bad.append(line[:200])
            if "合计" in line:
                total_line = line
    finished = title.startswith("PASS") or title.startswith("DONE") or title.startswith("FAIL")
    return title, bad, total_line, finished


fails = 0
os.makedirs(WORK, exist_ok=True)
for page in pages:
    dom, title, bad, total_line = "", "", [], ""
    for attempt in range(ATTEMPTS):
        dom = run(page, attempt)
        title, bad, total_line, finished = parse(dom)
        # 页面没跑完（脚本被中断）才重试；真失败不重试，直接报出来
        if finished:
            break
    print("%-22s %-14s %s" % (page, title, total_line))
    for b in bad:
        print("    ", b)
    if bad or not (title.startswith("PASS") or title.startswith("DONE")):
        fails += 1

print("ALL PAGES OK" if fails == 0 else "FAILED PAGES: %d" % fails)
