# Smart City Expo 2026 — guia de butxaca no oficial

> Font de veritat neutral del projecte. `CLAUDE.md` només l'importa.

## Què és

PWA mòbil en català (HTML/CSS/JS vanilla, sense build, norma `web-vanilla`) amb les sessions del **Smart City Expo World Congress 2026**, 3–5 de novembre de 2026, **Fira Barcelona Gran Via** (L'Hospitalet de Llobregat). Subtítol: «Guia de butxaca no oficial · 3–5 nov, Barcelona».

Projecte **no oficial**: no té cap relació amb Fira de Barcelona ni amb l'organització del congrés, ni utilitza cap logotip real (icona neutra amb monograma «SCE»).

## Font i verificació

- Font única: **smartcityexpo.com/agenda**, descobert via `sitemap.xml` i fitxa de cada sessió.
- **422 sessions** llistades i importades (scrape del 2026-11-02, 10:45 GMT). Cobertura detallada a [INFORME_COBERTURA.md](INFORME_COBERTURA.md) (generat de `data/coverage.json`).
- Cada sessió porta `sourceUrl` (enllaç «Font oficial»), `retrievalMethod`, `venueStatus` i `recordStatus`.
- Hores en **Europe/Madrid**.

## Regles d'honestedat

- No s'inventa cap dada: si la font no dona descripció o ponents, la fitxa ho diu.
- L'accés es mostra tal com el dona la font (`access` normalitzat + `accessRaw` original); les sessions «només per invitació» no es presenten com a obertes.
- Les sessions s'enllacen sempre amb la seva fitxa oficial.
- El programa pot canviar: cal tornar a importar (vegeu més avall).

## Esquema de dades (`data/`)

- `events.json` → `{events:[{id, title, format, trackIds[], date 'YYYY-MM-DD', startTime, endTime, venueId, access, accessRaw, speakers:[{name, role}], description, sourceUrl, venueStatus, recordStatus, retrievalMethod, notesCa}]}`
  - `access`: `all-passes` · `invitation-only` · `no-visitor-pass` · `open-side-event`.
  - `id`: slug de la URL oficial; si es repeteix (p. ex. «thematic-keynote»), es prefixa amb el segment anterior de la URL.
- `venues.json` → `{venues:[{id, name, zone, address, venueStatus, notesCa}]}`; sense lat/lng. `zone` és només una agrupació: «Escenaris de l'expo», «Centre de Convencions (sales)», «Altres espais».
- `tracks.json` → `{tracks:[{id, name}]}` (temàtiques).
- `coverage.json` → comptadors, fonts consultades, buits coneguts.

`js/modules/data.js` carrega els quatre fitxers i resol `ev.venue` i `ev.tracks` (a partir de `venueId` / `trackIds`).

Validació: `node validate-catalog.cjs` (ids únics, data/hora vàlides, `endTime > startTime`, `venueId` i `trackIds` existents, `access` vàlid).

## Pantalles

| Pàgina | Contingut |
|---|---|
| `index.html` — Explora | Cerca (títol/ponent) + filtres: dia, format, espai, zona, temàtica, accés, preferits/pendents/«hi vaig». Ordre cronològic. |
| `ara.html` — Ara | Sessions del dia: **en curs** (agrupades per espai), **comença aviat**, **properes**, **acabades** (plegat). |
| `fitxa.html?id=…` — Fitxa | Títol, estat, espai + zona, format, temàtiques, accés, ponents (plegable si >5), descripció, «Font oficial». També s'obre com a modal des de les altres pantalles. |

Transversal: preferits i «hi vaig / ja hi he anat» (localStorage `smartCityExpo:*`), mode **Ara / Planificar** (data+hora; per defecte 2026-11-03), mida de lletra, còpia de seguretat JSON (`smartcityexpo-copia-AAAA-MM-DD.json`) i PWA (`sw.js`, `CACHE_NAME` `sce-shell-vN`: pujar-lo a cada canvi del shell).

Prefix d'ids/classes de la UI: `sce-`.

## Decisions

- **Sense rutes ni mapa**: tot és al mateix recinte (Fira Gran Via) i la font no dona plànol ni coordenades per sala. S'han eliminat Leaflet, geolocalització, aparcaments i organitzadors.
- Format de sessió = text lliure de la font (25 valors); es filtra dinàmicament, sense paleta fixa.
- La barra lateral de cada targeta es colora per **accés**.
- Fus horari fix **Europe/Madrid** (`status.js`: `nowAsEventWallClock` / `planAsEventWallClock`), independent del dispositiu.
- La pantalla **Explora** inclou una "Selecció recomanada" editorial de 10 sessions,
  centrada en IA urbana, dades municipals i innovació pública. És una vista fixa,
  independent dels preferits de cada usuari, definida a `js/config.js`.
- La pantalla **Ponents** deriva un índex de les persones incloses a les sessions,
  mostra una valoració editorial d'1 a 5 estrelles segons la rellevància de les seves
  sessions per a IA urbana, dades i innovació pública, i mostra totes les sessions on
  participa cada ponent.

## Com reimportar

Els scripts són a `tools/` (Python 3, només biblioteca estàndard):

1. Baixar `https://www.smartcityexpo.com/sitemap.xml` a `tools/sitemap.xml`.
2. `python tools/scrape.py` → genera `tools/raw.json` (fitxa de cada sessió).
3. `python tools/gen.py` → regenera `data/events.json`, `venues.json`, `tracks.json`, `coverage.json`.
4. `node validate-catalog.cjs`, actualitzar `INFORME_COBERTURA.md` i pujar `CACHE_NAME` a `sw.js`.

`raw.json` i `sitemap.xml` no es versionen (es poden tornar a generar).

## Execució local

`python -m http.server 8765` a la carpeta de l'app i obrir `http://localhost:8765/index.html`.

## Estructura

```
index.html · ara.html · fitxa.html · manifest.json · sw.js
js/        config, explora, ara, fitxa, planmode, navmenu, fontsize, backup
js/modules data, state, status, storage, ui
assets/    css (design-system + app.css), fontawesome, icons
data/      events, venues, tracks, coverage
tools/     scrape.py, gen.py
```
