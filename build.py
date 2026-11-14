"""Gabungkan src/ jadi satu file HTML siap pakai.

  python3 build.py

Hasil:
  dist/index.html     -> untuk di-hosting (Netlify Drop, GitHub Pages). GPS + peta aktif.
  index.html         -> salinan dist/index.html di root, untuk GitHub Pages.
  dist/artifact.html  -> versi tanpa <!doctype>/<head>, untuk dipublish sebagai artifact claude.ai.
"""
import base64, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
DIST = os.path.join(ROOT, "dist")


def read(p):
    with open(os.path.join(SRC, p), encoding="utf-8") as f:
        return f.read()


def inline_fonts(css):
    def rep(m):
        path = m.group(1)
        with open(os.path.join(SRC, path), "rb") as f:
            data = base64.b64encode(f.read()).decode()
        return f'url(data:font/woff2;base64,{data})'
    return re.sub(r'url\("(fonts/[^"]+\.woff2)"\)', rep, css)


def main():
    html = read("index.html")
    leaflet = re.sub(r"url\([^)]*\)", "none", read("vendor/leaflet.css"))
    css = inline_fonts(read("styles.css"))
    js = read("app.js")

    html = html.replace('<link rel="stylesheet" href="vendor/leaflet.css">\n', "")
    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{leaflet}\n{css}</style>")
    html = html.replace('<script src="app.js"></script>', f"<script>\n{js}</script>")

    os.makedirs(DIST, exist_ok=True)
    with open(os.path.join(DIST, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)

    # versi artifact: isi <head> yang relevan + isi <body>, tanpa kerangka dokumen
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    keep = "".join(re.findall(r"<title>.*?</title>\n?|<meta name=\"claude:[^>]*>\n?|<link[^>]*>\n?|<style>.*?</style>\n?", head, re.S))
    with open(os.path.join(DIST, "artifact.html"), "w", encoding="utf-8") as f:
        f.write(keep + body.strip() + "\n")

    # salinan di root repo supaya GitHub Pages (deploy from branch, root) langsung menampilkan aplikasi
    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)

    print("OK  index.html (root, untuk GitHub Pages)")
    print("OK  dist/index.html  (%d KB)" % (os.path.getsize(os.path.join(DIST, "index.html")) // 1024))
    print("OK  dist/artifact.html")


if __name__ == "__main__":
    main()
