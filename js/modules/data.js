/* ============================================================
   modules/data.js
   Càrrega del catàleg (JSON estàtics versionats) + índexs en
   memòria. El JSON és sempre la font — no hi ha scraping des del
   navegador. Es guarda una còpia a localStorage perquè les fitxes
   desades funcionin sense connexió i per poder mostrar "s'està
   utilitzant una còpia desada" si el fetch falla.
   ============================================================ */

import { readJSON, writeJSON } from "./storage.js";

let cachedCatalog = null;

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status} a ${url}`);
  return res.json();
}

function buildIndex(list, key = "id") {
  const map = new Map();
  for (const item of list) map.set(item[key], item);
  return map;
}

function buildCatalog({ tracks, venues, events, coverage }) {
  const tracksById = buildIndex(tracks.tracks);
  const venuesById = buildIndex(venues.venues);

  // Sessions enriquides amb les referències resoltes (venue, tracks), per
  // no repetir la mateixa cerca a cada pantalla.
  const enrichedEvents = events.events.map((ev) => ({
    ...ev,
    venue: ev.venueId ? venuesById.get(ev.venueId) || null : null,
    tracks: (ev.trackIds || []).map((id) => tracksById.get(id)).filter(Boolean)
  }));

  return {
    tracks: tracks.tracks,
    venues: venues.venues,
    events: enrichedEvents,
    coverage: coverage || null,
    tracksById,
    venuesById,
    eventsById: buildIndex(enrichedEvents)
  };
}

/**
 * Carrega el catàleg complet. Retorna { catalog, fromCache, fetchedAt }.
 * Si el fetch falla (sense connexió), recupera la còpia de localStorage
 * si n'hi ha — l'aplicació ha de continuar sent utilitzable.
 */
export async function loadCatalog() {
  if (cachedCatalog) return { catalog: cachedCatalog, fromCache: false, fetchedAt: null };

  const files = window.APP.dataFiles;
  try {
    const [tracks, venues, events, coverage] = await Promise.all([
      fetchJSON(files.tracks),
      fetchJSON(files.venues),
      fetchJSON(files.events),
      fetchJSON(files.coverage)
    ]);
    const raw = { tracks, venues, events, coverage };
    cachedCatalog = buildCatalog(raw);
    const fetchedAt = new Date().toISOString();
    // La còpia pot superar la quota de localStorage (catàleg gran): storage.js
    // ho tolera i només avisa per consola.
    writeJSON(window.APP.storageKeys.catalogCache, { raw, fetchedAt });
    return { catalog: cachedCatalog, fromCache: false, fetchedAt };
  } catch (err) {
    console.warn("[data] fetch del catàleg fallit, provant còpia local", err);
    const saved = readJSON(window.APP.storageKeys.catalogCache, null);
    if (saved && saved.raw) {
      cachedCatalog = buildCatalog(saved.raw);
      return { catalog: cachedCatalog, fromCache: true, fetchedAt: saved.fetchedAt };
    }
    throw err;
  }
}

export function groupByVenue(events) {
  const groups = new Map();
  for (const ev of events) {
    const key = ev.venueId || "__pendent__";
    if (!groups.has(key)) {
      groups.set(key, { venue: ev.venue, venueId: ev.venueId, events: [] });
    }
    groups.get(key).events.push(ev);
  }
  return Array.from(groups.values());
}
