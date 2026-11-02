import re, json, html, os, sys, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

# Executar des de tools\: baixa sitemap.xml de https://www.smartcityexpo.com/sitemap.xml
# (guardar-lo a tools\sitemap.xml) i escriu raw.json a la mateixa carpeta.
HERE = os.path.dirname(os.path.abspath(__file__))
sm = open(os.path.join(HERE, "sitemap.xml"), encoding="utf-8").read()
urls = re.findall(r"<loc>(https://www\.smartcityexpo\.com/agenda/[^<]+)</loc>", sm)
urls = [u for u in urls if u.rstrip("/") != "https://www.smartcityexpo.com/agenda"]

def clean(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()

def first(rx, t, flags=re.S):
    m = re.search(rx, t, flags)
    return m.group(1) if m else None

def fetch(u):
    for _ in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "curl/8.4.0"}), timeout=30).read().decode("utf-8", "replace")
        except Exception as e:
            err = str(e)
    return None

def parse(u):
    t = fetch(u)
    if not t:
        return {"sourceUrl": u, "error": "fetch-failed"}
    slug = urllib.parse.unquote(u.rstrip("/").split("/")[-1])
    start = first(r'<span class="start">([^<]+)</span>', t)
    end = first(r'<span class="end">([^<]+)</span>', t)
    block = first(r'<div class="event-content">(.*?)<hr class="sep">', t) or ""
    title = clean(first(r'<h1 class="title">(.*?)</h1>', t))
    fmt = clean(first(r'<span class="format">(.*?)</span>', block))
    tracks = [clean(x).strip("| ").strip() for x in re.findall(r'<span class="track"[^>]*>(.*?)</span>', block, re.S)]
    loc = clean(first(r'<span class="location">(?:<span[^>]*>.*?</span>)?(.*?)</span>', block))
    loc = re.sub(r"^\|\s*", "", loc)
    access = clean(first(r'<span class="access">(.*?)</span>', block))
    desc = clean(first(r'<div class="content">(.*?)(?:<h2 class="subtitle">|<div class="speakers)', t) or "")
    speakers = []
    for sp in re.findall(r'<a href="(https://www\.smartcityexpo\.com/speakers/[^"]+)" class="card">(.*?)</a>', t, re.S):
        name = clean(first(r'<p class="title[^>]*>(.*?)</p>', sp[1]))
        sub = clean(first(r'<p class="subtitle[^>]*>(.*?)</p>', sp[1]))
        speakers.append({"name": name, "role": sub})
    return {"slug": slug, "title": title, "format": fmt, "tracks": tracks, "start": start, "end": end,
            "location": loc, "access": access, "description": desc, "speakers": speakers, "sourceUrl": u}

with ThreadPoolExecutor(8) as ex:
    res = list(ex.map(parse, urls))
json.dump(res, open(os.path.join(HERE, "raw.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(res), sum(1 for r in res if r.get("error")), sum(1 for r in res if not r.get("start")))
