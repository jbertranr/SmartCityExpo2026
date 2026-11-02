/* ============================================================
   js/ara.js — pantalla "Ara" (vista inicial de tot el congrés)

   Script CLÀSSIC (no type="module") a propòsit: router.js recrea
   els <script src> en la navegació sense recàrrega però no en
   conserva l'atribut type, així que un <script type="module">
   trencaria en tornar a aquesta pantalla. En canvi, import()
   dinàmic funciona igual des d'un script clàssic — per això la
   lògica real viu en mòduls carregats amb import() dins d'aquesta
   IIFE, que només s'executa una vegada (el "ds:navigated" fa la
   resta, com mana el contracte de router.js).

   El criteri és purament temporal: només les sessions del dia que
   s'està mirant (avui en mode "Ara", el dia triat en mode
   "Planificar"), en seccions: en curs (agrupades per espai), comença
   aviat, properes i acabades.
   ============================================================ */
(function () {
  let mods = null;
  let state = { catalog: null, onlyFavorites: false, onlyPending: false };

  const BATCH = 40;

  function wallClockNow() {
    const mode = mods.state.getPlanMode();
    if (mode === "planificar") {
      const dt = mods.state.getPlanDateTime();
      return mods.status.planAsEventWallClock(dt.date, dt.time);
    }
    return mods.status.nowAsEventWallClock();
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function updateHeaderDate() {
    const mode = mods.state.getPlanMode();
    const label = document.getElementById("sce-header-subtitle");
    if (!label) return;
    if (mode === "planificar") {
      const dt = mods.state.getPlanDateTime();
      label.textContent = `Planificant · ${dt.date} ${dt.time}`;
    } else {
      const wc = mods.status.nowAsEventWallClock();
      label.textContent = `Ara · ${wc.dateStr}, ${pad(Math.floor(wc.minutesOfDay / 60))}:${pad(wc.minutesOfDay % 60)} (hora de Barcelona)`;
    }
  }

  function openFitxa(item) {
    const body = document.getElementById("dlg-fitxa-body");
    if (!body) {
      location.href = `fitxa.html?id=${encodeURIComponent(item.id)}`;
      return;
    }
    body.replaceChildren(mods.ui.buildFitxaCard(item, mods));
    document.getElementById("dlg-fitxa-title").textContent = item.title;
    if (window.DSModal) window.DSModal.obre("dlg-fitxa");
    else document.getElementById("dlg-fitxa").showModal();
    history.replaceState(null, "", `#ev=${encodeURIComponent(item.id)}`);
  }

  function section(title, icon, count) {
    const wrap = document.createElement("section");
    wrap.className = "sce-ara-section";
    const h = document.createElement("h2");
    h.className = "sce-ara-section__title";
    const i = document.createElement("i");
    i.className = icon;
    i.setAttribute("aria-hidden", "true");
    h.append(i, document.createTextNode(` ${title} (${count})`));
    wrap.append(h);
    return wrap;
  }

  // Pinta les targetes per llots: un dia pot tenir 160 sessions.
  function appendCards(parent, items, cardOpts) {
    const box = document.createElement("div");
    box.className = "sce-ara-cards";
    let shown = 0;
    const more = document.createElement("button");
    more.type = "button";
    more.className = "ds-button ds-button--ghost sce-more-btn";
    const paint = () => {
      const frag = document.createDocumentFragment();
      for (const item of items.slice(shown, shown + BATCH)) frag.append(mods.ui.renderEventCard(item, cardOpts));
      shown = Math.min(shown + BATCH, items.length);
      more.before(frag);
      if (shown >= items.length) more.remove();
      else more.textContent = `Mostra'n més (${items.length - shown} restants)`;
    };
    box.append(more);
    more.addEventListener("click", paint);
    paint();
    parent.append(box);
  }

  function render() {
    const container = document.getElementById("sce-ara-list");
    if (!container || !state.catalog) return;
    container.replaceChildren();

    const wc = wallClockNow();
    const prefs = mods.state.getPrefs();

    let events = state.catalog.events.filter((ev) => ev.date === wc.dateStr);
    if (state.onlyFavorites) events = events.filter((ev) => mods.state.isFavorite(ev));
    if (state.onlyPending) events = events.filter((ev) => !mods.state.isAttending(ev));

    if (events.length === 0) {
      container.append(mods.ui.emptyState(
        `No hi ha cap sessió per al ${wc.dateStr} amb aquest filtre.`,
        "fa-solid fa-calendar-xmark",
        { label: "Explora tot el catàleg", href: "index.html", icon: "fa-solid fa-magnifying-glass" }
      ));
      return;
    }

    const buckets = { "en-curs": [], "comença-aviat": [], proper: [], desconegut: [], acabat: [] };
    for (const ev of events) {
      const { state: st } = mods.status.computeStatus(ev, wc, prefs.startingSoonMinutes);
      (buckets[st] || buckets.desconegut).push(ev);
    }
    const byTime = (a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99") || a.title.localeCompare(b.title, "ca");
    Object.values(buckets).forEach((arr) => arr.sort(byTime));

    const cardOpts = {
      wallClock: wc,
      startingSoonMinutes: prefs.startingSoonMinutes,
      onOpen: openFitxa,
      onToggleFavorite: () => { if (state.onlyFavorites) render(); },
      onToggleAttending: () => { if (state.onlyPending) render(); }
    };

    // En curs: agrupat per espai (a un únic recinte, "on és" importa més que "qui").
    if (buckets["en-curs"].length) {
      const sec = section("En curs", "fa-solid fa-circle-check", buckets["en-curs"].length);
      const groups = mods.data.groupByVenue(buckets["en-curs"])
        .sort((a, b) => ((a.venue && a.venue.name) || "").localeCompare((b.venue && b.venue.name) || "", "ca"));
      for (const g of groups) sec.append(mods.ui.renderVenueGroup(g, cardOpts));
      container.append(sec);
    }

    const flat = [
      ["Comença aviat", "fa-solid fa-clock", buckets["comença-aviat"]],
      ["Properes", "fa-solid fa-hourglass-start", buckets.proper.concat(buckets.desconegut)]
    ];
    for (const [title, icon, items] of flat) {
      if (!items.length) continue;
      const sec = section(title, icon, items.length);
      appendCards(sec, items, cardOpts);
      container.append(sec);
    }

    if (buckets.acabat.length) {
      const details = document.createElement("details");
      details.className = "sce-ara-section sce-ara-done";
      const summary = document.createElement("summary");
      summary.textContent = `Acabades (${buckets.acabat.length})`;
      details.append(summary);
      let painted = false;
      details.addEventListener("toggle", () => {
        if (!details.open || painted) return;
        painted = true;
        appendCards(details, buckets.acabat, cardOpts);
      });
      container.append(details);
    }
  }

  function wireExtraFilters() {
    const toggle = (id, key) => {
      const btn = document.getElementById(id);
      if (!btn || btn.__sceWired) return;
      btn.__sceWired = true;
      btn.addEventListener("click", () => {
        state[key] = !state[key];
        btn.classList.toggle("ds-button--ghost", !state[key]);
        render();
      });
    };
    toggle("btn-filter-preferits", "onlyFavorites");
    toggle("btn-filter-pendents", "onlyPending");
  }

  async function init() {
    const container = document.getElementById("sce-ara-list");
    if (!container) return; // pantalla incorrecta (contracte router.js)

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

    state.onlyFavorites = false;
    state.onlyPending = false;
    updateHeaderDate();
    wireExtraFilters();

    try {
      const { catalog, fromCache } = await mods.data.loadCatalog();
      state.catalog = catalog;
      if (fromCache) {
        const notice = document.createElement("p");
        notice.className = "ds-text ds-text--sm ds-text--muted";
        notice.textContent = "Sense connexió: mostrant l'última còpia desada del catàleg.";
        container.before(notice);
      }
      render();
    } catch (err) {
      container.replaceChildren(mods.ui.emptyState("No s'ha pogut carregar el catàleg (sense connexió i sense còpia desada).", "fa-solid fa-triangle-exclamation"));
      console.error(err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);

  // El botó "Ara/Planificar" és comú a les pantalles (js/planmode.js, viu
  // al chrome): quan canvia el mode, "Ara" torna a pintar — només si la
  // pantalla activa és realment "Ara".
  document.addEventListener("sce:planmode-changed", () => {
    if (!document.getElementById("sce-ara-list") || !mods) return;
    updateHeaderDate();
    render();
  });
})();
