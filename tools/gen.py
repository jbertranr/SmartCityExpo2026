import json, os, re, unicodedata, collections

# Executar des de tools\ després de scrape.py (llegeix raw.json de la mateixa carpeta).
HERE = os.path.dirname(os.path.abspath(__file__))
raw = json.load(open(os.path.join(HERE, "raw.json"), encoding="utf-8"))
OUT = os.path.join(HERE, "..", "data")

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

ACCESS = {
    "All Passes": "all-passes",
    "Access by invitation only": "invitation-only",
    "Visitor Pass not allowed": "no-visitor-pass",
    "Open Side Event": "open-side-event",
}

def venue_of(loc):
    name = re.sub(r"^(Stage|Zone):\s*", "", loc).strip()
    if loc.startswith("Stage:") or loc == "Main Stage" or loc == "The Market":
        zone = "Escenaris de l'expo"
    elif re.match(r"CC\d", name):
        zone = "Centre de Convencions (sales)"
    else:
        zone = "Altres espais"
    return name, zone

venues, tracks, events = {}, {}, []
slug_count = collections.Counter(r["slug"] for r in raw)
for r in raw:
    # Alguns slugs es repeteixen (p. ex. "thematic-keynote" sota dues temàtiques):
    # en aquest cas es prefixa amb el segment anterior de la URL oficial.
    if slug_count[r["slug"]] > 1:
        r["slug"] = slug(r["sourceUrl"].rstrip("/").split("/")[-2]) + "-" + r["slug"]
    vname, zone = venue_of(r["location"])
    vid = slug(vname)
    venues.setdefault(vid, {
        "id": vid, "name": vname, "zone": zone,
        "address": "Fira Barcelona Gran Via (L'Hospitalet de Llobregat)",
        "venueStatus": "verified-official",
        "notesCa": f"Nom de l'espai tal com apareix a la fitxa oficial de cada sessió (camp \"{r['location']}\"). Tots els espais són dins del recinte de Fira Gran Via; no es dona cap plànol ni coordenades per sala.",
    })
    tids = []
    for t in r["tracks"]:
        t = t.strip()
        if not t:
            continue
        tid = slug(t)
        tracks.setdefault(tid, {"id": tid, "name": t.replace(" - ", " – ")})
        tids.append(tid)
    date, st = r["start"].split(" ")
    en = r["end"].split(" ")[1] if r.get("end") else None
    access_raw = r.get("access") or None
    events.append({
        "id": r["slug"], "title": r["title"], "format": r["format"] or None,
        "trackIds": tids, "date": date, "startTime": st, "endTime": en,
        "venueId": vid, "access": ACCESS.get(access_raw) if access_raw else None, "accessRaw": access_raw,
        "speakers": r["speakers"], "description": r["description"] or None,
        "sourceUrl": r["sourceUrl"], "venueStatus": "verified-official",
        "recordStatus": "confirmed", "retrievalMethod": "official-site",
        "notesCa": "Importat de la fitxa oficial de la sessió a smartcityexpo.com/agenda (2026-11-02). Hora en Europe/Madrid.",
    })

events.sort(key=lambda e: (e["date"], e["startTime"], e["title"]))
dump = lambda n, o: json.dump(o, open(os.path.join(OUT, f"{n}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
dump("events", {"events": events})
dump("venues", {"venues": sorted(venues.values(), key=lambda v: (v["zone"], v["name"]))})
dump("tracks", {"tracks": sorted(tracks.values(), key=lambda t: t["name"])})
cnt = collections.Counter(e["accessRaw"] for e in events)
dump("coverage", {
    "lastUpdated": "2026-11-02",
    "officialSiteTotalListed": len(raw), "imported": len(events),
    "byRecordStatus": {"confirmed": len(events), "tentative": 0, "pending": 0},
    "byAccess": dict(cnt),
    "withSpeakers": sum(1 for e in events if e["speakers"]),
    "withDescription": sum(1 for e in events if e["description"]),
    "sourcesChecked": [
        {"name": "smartcityexpo.com/agenda (sitemap.xml + fitxa de cada sessió)", "status": "imported",
         "notesCa": f"{len(raw)} sessions llistades al sitemap oficial el 2026-11-02 10:45 GMT; totes importades amb data, hora, espai, format, temàtica, accés i ponents."},
        {"name": "Esdeveniments paral·lels fora de Fira (OFF)", "status": "pending",
         "notesCa": "No consultats: només s'inclou el programa oficial dins de Fira Gran Via."},
    ],
    "knownGaps": [
        "El programa oficial pot canviar fins i tot durant el congrés; cal repetir la importació.",
        "Moltes sessions són 'Private Side Event' / només per invitació: es mostren amb l'accés indicat, sense assumir que siguin obertes.",
        "No hi ha plànol per sala ni coordenades: tot passa al recinte de Fira Gran Via.",
        "No s'han importat les exhibicions, expositors ni els City Tours (només l'agenda de sessions).",
    ],
    "conflicts": [],
})
print(len(events), len(venues), len(tracks), cnt)
