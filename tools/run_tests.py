import subprocess, sys, re, os, tempfile

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE = "http://127.0.0.1:8901/tests/"
pages = sys.argv[1:] or ["circuit-test.html", "board-test.html", "lab-test.html",
                         "records-test.html", "formula-test.html", "chem-test.html", "bio-test.html",
                         "sim-test.html", "ui-test.html"]
WORK = os.path.join(tempfile.gettempdir(), "sparklab-tests")


def text(html):
    html = re.sub(r"<br\s*/?>", "\n", html)
    html = re.sub(r"</(div|span|p|li)>", "\n", html)
    return re.sub(r"<[^>]+>", "", html)


fails = 0
for page in pages:
    os.makedirs(WORK, exist_ok=True)
    prof = os.path.join(WORK, page.replace(".html", "") + "-" + str(os.getpid()))
    out = subprocess.run([
        EDGE, "--headless", "--disable-gpu", "--no-first-run",
        "--user-data-dir=" + prof, "--virtual-time-budget=9000",
        "--dump-dom", BASE + page
    ], capture_output=True, text=True, encoding="utf-8", errors="replace")
    dom = out.stdout or ""
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
    print("%-22s %-14s %s" % (page, title, total_line))
    for b in bad:
        print("    ", b)
    if bad or not (title.startswith("PASS") or title.startswith("DONE")):
        fails += 1

print("ALL PAGES OK" if fails == 0 else "FAILED PAGES: %d" % fails)
