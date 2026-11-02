(function () {
  let mods = null;
  let speakers = [];
  let query = "";

  function speakerKey(name) {
    return name.trim().toLocaleLowerCase("ca");
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function editorialRating(speaker) {
    const wrap = el("div", "sce-speaker-rating");
    wrap.setAttribute("aria-label", `Valoració editorial: ${speaker.rating} de 5`);
    wrap.append(el("span", "sce-speaker-rating__label", `Valoració de la guia: ${speaker.rating}/5`));
    const stars = el("div", "sce-speaker-rating__stars");
    for (let value = 1; value <= 5; value += 1) {
      stars.append(el("span", `sce-speaker-star${value <= speaker.rating ? " is-active" : ""}`, "★"));
    }
    wrap.append(stars);
    if (speaker.reasons.length) {
      wrap.append(el("span", "sce-speaker-rating__reason", `Per què: ${speaker.reasons.join(" · ")}`));
    }
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
    const visible = speakers.filter((speaker) => {
      const haystack = `${speaker.name} ${speaker.roles.join(" ")}`.toLocaleLowerCase("ca");
      return !query || haystack.includes(query);
    });
    document.getElementById("sce-speakers-count").textContent = `${visible.length} ${visible.length === 1 ? "ponent" : "ponents"}`;
    list.replaceChildren();
    if (!visible.length) {
      list.append(mods.ui.emptyState("No hi ha ponents que coincideixin amb la cerca.", "fa-solid fa-microphone-lines"));
      return;
    }
    for (const speaker of visible) {
      const card = el("article", "ds-card sce-speaker-card");
      card.append(el("h2", "sce-speaker-card__name", speaker.name));
      if (speaker.roles.length) card.append(el("p", "sce-speaker-card__role", speaker.roles.join(" · ")));
      card.append(editorialRating(speaker));
      card.append(el("h3", "sce-speaker-card__sessions-title", `Sessions i taules (${speaker.sessions.length})`));
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
      .map((speaker) => {
        const topicScores = new Map();
        let totalScore = 0;
        for (const item of speaker.sessions) {
          const text = `${item.title} ${item.description || ""}`.toLocaleLowerCase("ca");
          const topics = [
            ["IA urbana", ["ai", "artificial", "agentic"]],
            ["dades i digitalització", ["data", "digital", "digital twin", "iot"]],
            ["innovació pública", ["govtech", "public", "municipal", "government"]],
            ["serveis urbans", ["city", "cities", "urban", "smart city"]],
            ["mobilitat i resiliència", ["mobility", "transport", "climate", "energy", "resilien"]]
          ];
          let sessionScore = 1;
          for (const [label, words] of topics) {
            if (words.some((word) => text.includes(word))) {
              sessionScore += 1;
              topicScores.set(label, (topicScores.get(label) || 0) + 1);
            }
          }
          if (window.APP.recommendedEventIds.includes(item.id)) sessionScore += 1;
          totalScore += Math.min(sessionScore, 5);
        }
        return {
          ...speaker,
          roles: Array.from(speaker.roles),
          sessions: speaker.sessions.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
          rating: Math.max(1, Math.min(5, Math.round(totalScore / speaker.sessions.length))),
          reasons: Array.from(topicScores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label)
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ca"));
  }

  async function init() {
    const list = document.getElementById("sce-speakers-list");
    if (!list || mods) return;
    const [data, ui] = await Promise.all([
      import("./modules/data.js"),
      import("./modules/ui.js")
    ]);
    mods = { data, ui };
    try {
      speakers = buildSpeakers((await mods.data.loadCatalog()).catalog.events);
      document.getElementById("sce-speakers-search").addEventListener("input", (event) => {
        query = event.target.value.trim().toLocaleLowerCase("ca");
        render();
      });
      render();
    } catch (error) {
      list.replaceChildren(mods.ui.emptyState("No s'han pogut carregar els ponents.", "fa-solid fa-triangle-exclamation"));
      console.error(error);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
