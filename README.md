# Smart City Expo 2026 — guia de butxaca no oficial

PWA mòbil (HTML/CSS/JS vanilla, sense build) amb les sessions del Smart City Expo World Congress 2026 (3–5 nov, Fira Barcelona Gran Via). **No oficial.**

- Documentació completa (font de veritat): [index.md](index.md)
- Cobertura de les dades: [INFORME_COBERTURA.md](INFORME_COBERTURA.md)

## Executar en local

```
python -m http.server 8765
```

Obre `http://localhost:8765/index.html`.

## Validar el catàleg

```
node validate-catalog.cjs
```

## Pantalles

`index.html` (Explora), `ara.html` (Ara) i `fitxa.html?id=…` (fitxa). Sense rutes ni mapa: tot passa en un únic recinte.
