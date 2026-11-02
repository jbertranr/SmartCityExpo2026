/* ============================================================
   js/explora.js — pantalla "Explora": cerca + filtres sobre tot
   el catàleg. Script clàssic + import() dinàmic (vegeu ara.js).
   ============================================================ */
(function () {
  let mods = null;
  let catalog = null;
  const EMPTY_FILTERS = { q: "", day: "", format: "", venueId: "", zone: "", trackId: "", access: "", preferits: false, pendents: false, triats: false, recomanades: false };
  let filters = { ...EMPTY_FILTERS };

  const SELECT_IDS = {
    day: "sce-filter-day",
    format: "sce-filter-format",
    venueId: "sce-filter-venue",
    zone: "sce-filter-zone",
    trackId: "sce-filter-track",
    access: "sce-filter-access"
  };

  function normalizeSearch(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ca").trim();
  }

  function wallClockNow() {
    const mode = mods.state.getPlanMode();
    if (mode === "planificar") {
      const dt = mods.state.getPlanDateTime();
      return mods.status.planAsEventWallClock(dt.date, dt.time);
    }
    return mods.status.nowAsEventWallClock();
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

  function matches(item) {
    if (filters.day && item.date !== filters.day) return false;
    if (filters.format && item.format !== filters.format) return false;
    if (filters.venueId && item.venueId !== filters.venueId) return false;
    if (filters.zone && (!item.venue || item.venue.zone !== filters.zone)) return false;
    if (filters.trackId && !(item.trackIds || []).includes(filters.trackId)) return false;
    if (filters.access && item.access !== filters.access) return false;
    if (filters.q) {
      const hay = normalizeSearch([item.title, ...(item.speakers || []).map((s) => `${s.name} ${s.role || ""}`)].join(" "));
      if (!hay.includes(filters.q)) return false;
    }
    if (filters.preferits && !mods.state.isFavorite(item)) return false;
    if (filters.pendents && mods.state.isAttending(item)) return false;
    if (filters.triats && !mods.state.isAttending(item)) return false;
    if (filters.recomanades && !window.APP.recommendedEventIds.includes(item.id)) return false;
    return true;
  }

  function render() {
    const list = document.getElementById("sce-explora-list");
    const countEl = document.getElementById("sce-results-count");
    if (!list || !catalog) return;
    list.replaceChildren();

    const wallClock = wallClockNow();
    const prefs = mods.state.getPrefs();

    const results = catalog.events.filter(matches);
    results.sort((a, b) => {
      const ad = `${a.date} ${a.startTime || "99:99"}`;
      const bd = `${b.date} ${b.startTime || "99:99"}`;
      if (ad !== bd) return ad.localeCompare(bd);
      return a.title.localeCompare(b.title, "ca");
    });

    countEl.textContent = `${results.length} ${results.length === 1 ? "sessió" : "sessions"}`;

    if (results.length === 0) {
      list.append(mods.ui.emptyState(
        "Cap sessió coincideix amb els filtres.",
        "fa-solid fa-magnifying-glass",
        { label: "Treu els filtres", icon: "fa-solid fa-filter-circle-xmark", onClick: resetFilters }
      ));
      return;
    }

    // 422 targetes de cop són pesades en un mòbil: es pinten per llots.
    const BATCH = 60;
    let shown = 0;
    const more = document.createElement("button");
    more.type = "button";
    more.className = "ds-button ds-button--ghost sce-more-btn";
    const paint = () => {
      const frag = document.createDocumentFragment();
      for (const item of results.slice(shown, shown + BATCH)) {
        frag.append(mods.ui.renderEventCard(item, {
          wallClock,
          startingSoonMinutes: prefs.startingSoonMinutes,
          onOpen: openFitxa,
          onToggleFavorite: () => { if (filters.preferits) render(); },
          onToggleAttending: () => { if (filters.pendents || filters.triats) render(); }
        }));
      }
      shown = Math.min(shown + BATCH, results.length);
      more.before(frag);
      if (shown >= results.length) more.remove();
      else more.textContent = `Mostra'n més (${results.length - shown} restants)`;
    };
    list.append(more);
    more.addEventListener("click", paint);
    paint();
  }

  function resetFilters() {
    filters = { ...EMPTY_FILTERS };
    Object.values(SELECT_IDS).forEach((id) => {
      const sel = document.getElementById(id);
      if (sel) sel.value = "";
    });
    const q = document.getElementById("sce-search");
    if (q) q.value = "";
    ["btn-filter-preferits", "btn-filter-pendents", "btn-filter-triats", "btn-filter-recomanades"].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.add("ds-button--ghost");
    });
    render();
  }

  function wireFilters() {
    const toggle = (id, key) => {
      const btn = document.getElementById(id);
      if (!btn || btn.__sceWired) return;
      btn.__sceWired = true;
      btn.addEventListener("click", () => {
        filters[key] = !filters[key];
        btn.classList.toggle("ds-button--ghost", !filters[key]);
        render();
      });
    };
    toggle("btn-filter-preferits", "preferits");
    toggle("btn-filter-pendents", "pendents");
    toggle("btn-filter-triats", "triats");
    toggle("btn-filter-recomanades", "recomanades");

    for (const [key, id] of Object.entries(SELECT_IDS)) {
      const sel = document.getElementById(id);
      if (!sel || sel.__sceWired) continue;
      sel.__sceWired = true;
      sel.addEventListener("change", () => { filters[key] = sel.value; render(); });
    }

    const q = document.getElementById("sce-search");
    if (q && !q.__sceWired) {
      q.__sceWired = true;
      q.addEventListener("input", () => { filters.q = normalizeSearch(q.value); render(); });
    }
  }

  function fillSelect(id, entries) {
    const select = document.getElementById(id);
    if (!select) return;
    for (const { value, label } of entries) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      select.append(opt);
    }
  }

  function countBy(fn) {
    const counts = new Map();
    for (const ev of catalog.events) {
      const keys = fn(ev);
      for (const k of Array.isArray(keys) ? keys : [keys]) {
        if (k) counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    return counts;
  }

  // Només valors que realment apareixen al catàleg, ordenats.
  function populateFilters() {
    const days = countBy((e) => e.date);
    fillSelect(SELECT_IDS.day, Array.from(days.keys()).sort().map((d) => ({ value: d, label: `${mods.ui.formatEventDate(d)} (${days.get(d)})` })));

    const formats = countBy((e) => e.format);
    fillSelect(SELECT_IDS.format, Array.from(formats.keys()).sort((a, b) => a.localeCompare(b, "ca")).map((f) => ({ value: f, label: `${f} (${formats.get(f)})` })));

    const venues = countBy((e) => e.venueId);
    fillSelect(SELECT_IDS.venueId, catalog.venues
      .filter((v) => venues.has(v.id))
      .sort((a, b) => a.name.localeCompare(b.name, "ca"))
      .map((v) => ({ value: v.id, label: `${v.name} (${venues.get(v.id)})` })));

    const zones = countBy((e) => e.venue && e.venue.zone);
    fillSelect(SELECT_IDS.zone, Array.from(zones.keys()).sort((a, b) => a.localeCompare(b, "ca")).map((z) => ({ value: z, label: `${z} (${zones.get(z)})` })));

    const tracks = countBy((e) => e.trackIds || []);
    fillSelect(SELECT_IDS.trackId, catalog.tracks
      .filter((t) => tracks.has(t.id))
      .sort((a, b) => a.name.localeCompare(b.name, "ca"))
      .map((t) => ({ value: t.id, label: `${t.name} (${tracks.get(t.id)})` })));

    const access = countBy((e) => e.access);
    fillSelect(SELECT_IDS.access, Object.keys(mods.ui.ACCESS_META)
      .filter((a) => access.has(a))
      .map((a) => ({ value: a, label: `${mods.ui.ACCESS_META[a].label} (${access.get(a)})` })));
  }

  async function init() {
    const list = document.getElementById("sce-explora-list");
    if (!list) return;

    const subtitle = document.getElementById("sce-header-subtitle");
    if (subtitle) subtitle.textContent = "Explora · totes les sessions";

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

    const params = new URLSearchParams(location.search);
    filters = { ...EMPTY_FILTERS, recomanades: params.get("seleccio") === "1" };

    try {
      const { catalog: c } = await mods.data.loadCatalog();
      catalog = c;
      populateFilters();
      wireFilters();
      const recommendedButton = document.getElementById("btn-filter-recomanades");
      if (recommendedButton) recommendedButton.classList.toggle("ds-button--ghost", !filters.recomanades);

      for (const [param, key] of [["day", "day"], ["format", "format"]]) {
        const v = params.get(param);
        const sel = document.getElementById(SELECT_IDS[key]);
        if (v && sel) { sel.value = v; filters[key] = sel.value; }
      }
      render();
    } catch (err) {
      list.replaceChildren(mods.ui.emptyState("No s'ha pogut carregar el catàleg.", "fa-solid fa-triangle-exclamation"));
      console.error(err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);

  // El mode Ara/Planificar canvia els estats temporals de les targetes.
  document.addEventListener("sce:planmode-changed", () => {
    if (mods && catalog && document.getElementById("sce-explora-list")) render();
  });
})();
