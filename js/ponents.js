(function () {
  let mods = null;
  let speakers = [];
  let query = "";
  let ratedOnly = false;

  function speakerKey(name) {
    return name.trim().toLocaleLowerCase("ca");
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function starRating(speaker) {
    const rating = mods.state.getSpeakerRatings()[speaker.key] || 0;
    const wrap = el("div", "sce-speaker-rating");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", `Valora ${speaker.name} d'una a cinc estrelles`);
    const label = el("span", "sce-speaker-rating__label", rating ? `La teva valoració: ${rating}/5` : "Valora aquest ponent");
    wrap.append(label);
    const buttons = el("div", "sce-speaker-rating__stars");
    for (let value = 1; value <= 5; value += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `sce-speaker-star${value <= rating ? " is-active" : ""}`;
      button.setAttribute("aria-label", `${value} ${value === 1 ? "estrella" : "estrelles"}`);
      button.setAttribute("aria-pressed", String(value === rating));
      button.append(document.createTextNode("★"));
      button.addEventListener("click", () => {
        mods.state.setSpeakerRating(speaker.key, value);
        render();
      });
      buttons.append(button);
    }
    if (rating) {
      const clear = el("button", "ds-button ds-button--sm ds-button--ghost sce-speaker-rating__clear", "Neteja");
      clear.type = "button";
      clear.addEventListener("click", () => {
        mods.state.setSpeakerRating(speaker.key, 0);
        render();
      });
      buttons.append(clear);
    }
    wrap.append(buttons);
    return wrap;
  }

  function sessionLink(item) {
    const link = el("a", "sce-speaker-session", `${mods.ui.formatEventDateTime(item)} · ${item.title}`);
    link.href = `fitxa.html?id=${encodeURIComponent(item.id)}`;
    link.setAttribute("data-no-router", "");
    return link;
  }

  function render() {
    const list = document.getElementById("sce-speakers-list");
    if (!list) return;
    const ratings = mods.state.getSpeakerRatings();
    const visible = speakers.filter((speaker) => {
      const haystack = `${speaker.name} ${speaker.roles.join(" ")}`.toLocaleLowerCase("ca");
      return (!query || haystack.includes(query)) && (!ratedOnly || ratings[speaker.key]);
    });
    document.getElementById("sce-speakers-count").textContent = `${visible.length} ${visible.length === 1 ? "ponent" : "ponents"}`;
    list.replaceChildren();
    if (!visible.length) {
      list.append(mods.ui.emptyState("No hi ha ponents que coincideixin amb la cerca.", "fa-solid fa-microphone-lines"));
      return;
    }
    for (const speaker of visible) {
      const card = el("article", "ds-card sce-speaker-card");
      const heading = el("h2", "sce-speaker-card__name", speaker.name);
      card.append(heading);
      if (speaker.roles.length) card.append(el("p", "sce-speaker-card__role", speaker.roles.join(" · ")));
      card.append(starRating(speaker));
      const sessionsHeading = el("h3", "sce-speaker-card__sessions-title", `Sessions i taules (${speaker.sessions.length})`);
      card.append(sessionsHeading);
      const sessionList = el("div", "sce-speaker-card__sessions");
      speaker.sessions.forEach((item) => sessionList.append(sessionLink(item)));
      card.append(sessionList);
      list.append(card);
    }
  }

  function buildSpeakers(events) {
    const byKey = new Map();
    for (const item of events) {
      for (const raw of item.speakers || []) {
        if (!raw.name) continue;
        const key = speakerKey(raw.name);
        if (!byKey.has(key)) byKey.set(key, { key, name: raw.name.trim(), roles: new Set(), sessions: [] });
        const speaker = byKey.get(key);
        if (raw.role) speaker.roles.add(raw.role.trim());
        speaker.sessions.push(item);
      }
    }
    return Array.from(byKey.values())
      .map((speaker) => ({ ...speaker, roles: Array.from(speaker.roles), sessions: speaker.sessions.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)) }))
      .sort((a, b) => a.name.localeCompare(b.name, "ca"));
  }

  async function init() {
    const list = document.getElementById("sce-speakers-list");
    if (!list || mods) return;
    const [data, state, ui] = await Promise.all([
      import("./modules/data.js"),
      import("./modules/state.js"),
      import("./modules/ui.js")
    ]);
    mods = { data, state, ui };
    try {
      speakers = buildSpeakers((await mods.data.loadCatalog()).catalog.events);
      const search = document.getElementById("sce-speakers-search");
      search.addEventListener("input", () => { query = search.value.trim().toLocaleLowerCase("ca"); render(); });
      document.getElementById("sce-speakers-rated-only").addEventListener("change", (event) => { ratedOnly = event.target.checked; render(); });
      render();
    } catch (error) {
      list.replaceChildren(mods.ui.emptyState("No s'han pogut carregar els ponents.", "fa-solid fa-triangle-exclamation"));
      console.error(error);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
