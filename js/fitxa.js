/* ============================================================
   js/fitxa.js — fitxa d'una sessió (?id=…), com a pàgina pròpia:
   és el fallback real i el punt d'entrada per a enllaç directe /
   compartir (les altres pantalles l'obren com a modal amb el mateix
   contingut, construït per ui.js#buildFitxaCard).
   Script clàssic + import() dinàmic (vegeu ara.js).
   ============================================================ */
(function () {
  let mods = null;

  async function init() {
    const container = document.getElementById("sce-fitxa-content");
    if (!container) return;

    const subtitle = document.getElementById("sce-header-subtitle");
    if (subtitle) subtitle.textContent = "Fitxa de la sessió";

    if (!mods) {
      const [storage, status, data, stateMod, ui] = await Promise.all([
        import("./modules/storage.js"),
        import("./modules/status.js"),
        import("./modules/data.js"),
        import("./modules/state.js"),
        import("./modules/ui.js")
      ]);
      mods = { storage, status, data, state: stateMod, ui };
    }

    const id = new URLSearchParams(location.search).get("id");

    try {
      const { catalog } = await mods.data.loadCatalog();
      const item = catalog.eventsById.get(id);
      if (!item) {
        container.replaceChildren(mods.ui.emptyState("No s'ha trobat aquesta sessió al catàleg.", "fa-solid fa-circle-question"));
        return;
      }
      document.title = `${item.title} · Smart City Expo 2026`;
      container.replaceChildren(mods.ui.buildFitxaCard(item, mods));
    } catch (err) {
      container.replaceChildren(mods.ui.emptyState("No s'ha pogut carregar el catàleg.", "fa-solid fa-triangle-exclamation"));
      console.error(err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
