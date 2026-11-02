/* ============================================================
   Smart City Expo 2026 — configuració
   Script clàssic (no mòdul) perquè estigui disponible com a global
   window.APP abans que s'executin els mòduls de cada pantalla.
   ============================================================ */
window.APP = {
  title: "Smart City Expo 2026",
  subtitle: "Guia de butxaca no oficial · 3–5 nov, Barcelona",
  timeZone: "Europe/Madrid",

  // Data per defecte del selector "Planificar" — primer dia del congrés
  // (3–5 nov 2026). El mode "Ara" sempre fa servir l'hora real del
  // dispositiu, convertida a Europe/Madrid.
  defaultPlanDate: "2026-11-03",

  // Llindar de "comença aviat": preferència de la interfície, no una
  // dada del programa oficial.
  startingSoonMinutes: 45,

  // Selecció editorial de sessions recomanades; els títols i la resta de
  // dades es resolen sempre des de data/events.json.
  recommendedEventIds: [
    "opening-session-urban-solutions-real-impact",
    "from-data-to-delivery-scaling-govtech-through-multilevel-partnership",
    "deploying-urban-ai-in-an-era-of-tech-sovereignty",
    "the-city-as-a-living-system-navigating-the-era-of-agentic-ai",
    "people-centred-smart-cities-making-ai-work-for-cities-and-people",
    "data-spaces-in-intelligent-territories-from-vision-to-impact",
    "urban-ai-sharing-municipal-solutions-to-urban-challenges",
    "from-city-data-to-city-action-how-ai-empowers-municipal-teams",
    "govtech-public-innovation",
    "whose-data-is-it-anyway"
  ],

  storageKeys: {
    favorites: "smartCityExpo:favorits",
    attendance: "smartCityExpo:assistencia",
    speakerRatings: "smartCityExpo:valoracionsPonents",
    planMode: "smartCityExpo:mode",
    planDateTime: "smartCityExpo:dataHoraPlanificada",
    prefs: "smartCityExpo:preferencies",
    catalogCache: "smartCityExpo:catalogCache",
    lastBackupAt: "smartCityExpo:ultimaCopia"
  },

  dataFiles: {
    tracks: "data/tracks.json",
    venues: "data/venues.json",
    events: "data/events.json",
    coverage: "data/coverage.json"
  }
};
