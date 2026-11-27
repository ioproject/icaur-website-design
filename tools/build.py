#!/usr/bin/env python3
"""
Static site generator for the iCAUR prototype — Python 3 standard library only.

    python3 tools/build.py          # build once into dist/
    python3 tools/build.py --watch  # rebuild whenever src/ changes

Source layout
    src/pages/*.html        page templates
    src/partials/*.html     shared parts (head, header, footer...)
    src/content/it.json     all texts (the site is Italian only)
    src/assets/             css, js, fonts, img, video (copied as-is)

Output: dist/ (pages at the root, assets in dist/assets/).

Template syntax
    {{ home.hero.title }}            text from it.json (raw HTML allowed)
    {% include header %}             src/partials/header.html
    {% for item in home.news.items %} ... {{ item.title }} ... {% endfor %}   (list in the JSON, not nested)
    {{ @v }}       build timestamp, appended to CSS/JS URLs so browsers fetch the new files
    {{ @assets }}  path prefix to dist/assets/      {{ @lang }}  language code (it)
    {{ @page }}    current page file name
    {{ @current:v27.html }}  -> ' aria-current="page"' when on that page
"""
import json, os, re, shutil, sys, time
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DIST = os.path.join(ROOT, "src"), os.path.join(ROOT, "dist")
LANG = "it"

INCLUDE = re.compile(r"{%\s*include\s+([\w-]+)\s*%}")
LOOP = re.compile(r"{%\s*for\s+(\w+)\s+in\s+([\w.]+)\s*%}(.*?){%\s*endfor\s*%}", re.S)
VAR = re.compile(r"{{\s*([@\w.:-]+)\s*}}")


def lookup(data, path):
    cur = data
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        elif isinstance(cur, list) and part.isdigit():
            cur = cur[int(part)]
        else:
            raise KeyError(path)
    return cur


def render(tpl, content, ctx, where):
    def include(m, depth=0):
        path = os.path.join(SRC, "partials", m.group(1) + ".html")
        with open(path, encoding="utf-8") as f:
            return INCLUDE.sub(include, f.read())
    tpl = INCLUDE.sub(include, tpl)

    def loop(m):
        var, path, body = m.groups()
        items = lookup(content, path)
        return "".join(VAR.sub(lambda v: value(v, {var: item}), body) for item in items)

    def value(m, local=None):
        key = m.group(1)
        if key.startswith("@current:"):
            return ' aria-current="page"' if ctx["@page"] == key.split(":", 1)[1] else ""
        if key.startswith("@"):
            return ctx[key]
        head = key.split(".", 1)[0]
        try:
            if local and head in local:
                return str(local[head] if "." not in key else lookup(local[head], key.split(".", 1)[1]))
            return str(lookup(content, key))
        except KeyError:
            print(f"  ! missing text '{key}' in {where}")
            return f"[[{key}]]"

    tpl = LOOP.sub(loop, tpl)
    return VAR.sub(value, tpl)


def build():
    version = str(int(time.time()))   # new value on every build (also in --watch mode)
    t0 = time.time()
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    shutil.copytree(os.path.join(SRC, "assets"), os.path.join(DIST, "assets"),
                    ignore=shutil.ignore_patterns(".DS_Store"))
    pages = sorted(p for p in os.listdir(os.path.join(SRC, "pages")) if p.endswith(".html"))
    with open(os.path.join(SRC, "content", f"{LANG}.json"), encoding="utf-8") as f:
        content = json.load(f)
    for page in pages:
        with open(os.path.join(SRC, "pages", page), encoding="utf-8") as f:
            tpl = f.read()
        ctx = {"@lang": LANG, "@page": page, "@assets": "assets/", "@v": version}
        html = render(tpl, content, ctx, page)
        with open(os.path.join(DIST, page), "w", encoding="utf-8") as f:
            f.write(html)
    print(f"built {len(pages)} pages in {time.time() - t0:.2f}s")


def snapshot():
    state = {}
    for base, _, files in os.walk(SRC):
        for name in files:
            p = os.path.join(base, name)
            state[p] = os.path.getmtime(p)
    return state


if __name__ == "__main__":
    build()
    if "--watch" in sys.argv:
        print("watching src/ ...")
        last = snapshot()
        while True:
            time.sleep(0.5)
            now = snapshot()
            if now != last:
                last = now
                try:
                    build()
                except Exception as e:  # keep watching on template errors
                    print("build error:", e)
