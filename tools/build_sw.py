"""Обновляет список файлов и версию кеша в sw.js. Запускать после любых правок: python3 tools/build_sw.py"""
import hashlib, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ["./", "index.html", "styles.css", "app.js", "sync.js", "supabase-config.js", "manifest.webmanifest"]
for d in ("data", "img", "fonts", "icons", "vendor"):
    FILES += sorted(f"{d}/{f}" for f in os.listdir(os.path.join(ROOT, d)) if not f.startswith(".") and not f.endswith("LICENSE"))
h = hashlib.sha1()
for f in FILES[1:]:
    h.update(open(os.path.join(ROOT, f), "rb").read())
sw_path = os.path.join(ROOT, "sw.js")
sw = open(sw_path, encoding="utf-8").read()
sw = re.sub(r'const VERSION=".*?";', f'const VERSION="{h.hexdigest()[:10]}";', sw)
sw = re.sub(r"const ASSETS=\[.*?\];", "const ASSETS=" + json.dumps(FILES, ensure_ascii=False) + ";", sw, flags=re.S)
open(sw_path, "w", encoding="utf-8").write(sw)
print("sw.js:", len(FILES), "files, version", h.hexdigest()[:10])
