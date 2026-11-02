/* ============================================================
   modules/ui.js
   Peces d'interfície reutilitzables entre pantalles: targeta de
   sessió, grup per espai, distintius de format/accés i píndola
   d'estat temporal. La lògica de dades (estat, resolució de
   referències) viu als altres mòduls — aquí només hi ha construcció
   de DOM, sense innerHTML amb dades del catàleg (norma web-vanilla).

   Convenció de noms: l'objecte de domini "sessió" es diu sempre
   `item` als paràmetres — mai `event`, per no confondre'l amb un
   DOM Event.
   ============================================================ */

import { computeStatus, statusVariant } from "./status.js";
import { isFavorite, isAttending, toggleFavorite, toggleAttending } from "./state.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function iconEl(classes) {
  const i = document.createElement("i");
  i.className = classes;
  i.setAttribute("aria-hidden", "true");
  return i;
}

// Capçalera de secció amb icona — text sempre fix de la interfície,
// mai dades del catàleg.
function sectionHeading(icon, text) {
  const h2 = document.createElement("h2");
  h2.append(iconEl(icon), document.createTextNode(" " + text));
  return h2;
}

const MONTHS_CA = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];

export function formatEventDate(dateStr) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} de ${MONTHS_CA[m - 1]}`;
}

export function formatEventDateTime(item) {
  const datePart = formatEventDate(item.date);
  if (!item.startTime) return `${datePart} · hora per confirmar`;
  return `${datePart} · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}`;
}

// Accés: etiqueta en català + variant de badge + color de la barra
// lateral de la targeta. Els valors venen tal qual de la font oficial
// (camp `access`); `accessRaw` conserva el text original en anglès.
export const ACCESS_META = {
  "all-passes": { label: "Tots els passos", badge: "ds-badge--ok", icon: "fa-solid fa-ticket", colorVar: "--ds-color-success" },
  "invitation-only": { label: "Només per invitació", badge: "ds-badge--warn", icon: "fa-solid fa-envelope", colorVar: "--ds-color-warning" },
  "no-visitor-pass": { label: "No amb Visitor Pass", badge: "ds-badge--danger", icon: "fa-solid fa-ban", colorVar: "--ds-color-danger" },
  "open-side-event": { label: "Esdeveniment lateral obert", badge: "ds-badge--primary", icon: "fa-solid fa-door-open", colorVar: "--ds-color-primary" }
};

export function accessMeta(access) {
  return ACCESS_META[access] || { label: "Accés per confirmar", badge: "ds-badge--neutral", icon: "fa-solid fa-circle-question", colorVar: "--ds-color-muted" };
}

export function accessBadge(item) {
  const meta = accessMeta(item.access);
  const b = el("span", `ds-badge ds-badge--sm ${meta.badge}`);
  b.append(iconEl(meta.icon), document.createTextNode(" " + meta.label));
  return b;
}

export function formatBadge(format) {
  const b = el("span", "ds-badge ds-badge--sm sce-badge--format");
  b.append(iconEl("fa-solid fa-microphone-lines"), document.createTextNode(" " + (format || "Sessió")));
  return b;
}

export function statusPill(item, wallClock, startingSoonMinutes) {
  const status = computeStatus(item, wallClock, startingSoonMinutes);
  const variant = statusVariant(status.state);
  const span = el("span", `ds-status${variant ? ` ds-status--${variant}` : ""}`);
  span.append(el("span", "ds-status__dot"), iconEl(status.icon), document.createTextNode(" " + status.label));
  span.dataset.state = status.state;
  return { node: span, status };
}

function fitxaHref(item) {
  return `fitxa.html?id=${encodeURIComponent(item.id)}`;
}
// Enllaç real cap a la fitxa — deixa passar clic amb modificador / botó
// central (obrir en pestanya nova ha de funcionar com en qualsevol enllaç).
function wireCardNavigate(a, item, onOpen) {
  a.href = fitxaHref(item);
  a.setAttribute("data-no-router", "");
  a.addEventListener("click", (domEvent) => {
    if (domEvent.defaultPrevented || domEvent.button !== 0 || domEvent.metaKey || domEvent.ctrlKey || domEvent.shiftKey || domEvent.altKey) return;
    domEvent.preventDefault();
    onOpen(item);
  });
}

/**
 * Targeta compacta de sessió (llistes "Ara" i resultats d'"Explora").
 * onOpen(item) es crida en fer clic.
 */
export function renderEventCard(item, { wallClock, startingSoonMinutes, onOpen, onToggleFavorite, onToggleAttending, hideVenue = false }) {
  const card = el("div", "ds-card ds-card--status-start sce-card");
  card.setAttribute("data-event-id", item.id);
  card.style.setProperty("--ds-card-color", `var(${accessMeta(item.access).colorVar})`);

  const top = el("div", "sce-card__top");
  top.append(formatBadge(item.format), accessBadge(item));

  const actionBtns = el("div", "sce-card__action-btns");

  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "sce-card__action-btn sce-card__action-btn--fav";
  function reflectFav() {
    const fav = isFavorite(item);
    favBtn.replaceChildren(iconEl(`fa-${fav ? "solid" : "regular"} fa-star`));
    favBtn.classList.toggle("is-active", fav);
    favBtn.setAttribute("aria-pressed", String(fav));
    favBtn.setAttribute("aria-label", fav ? `Treure ${item.title} de preferits` : `Afegir ${item.title} a preferits`);
  }
  reflectFav();
  favBtn.addEventListener("click", (domEvent) => {
    domEvent.stopPropagation();
    toggleFavorite(item);
    reflectFav();
    if (onToggleFavorite) onToggleFavorite(item);
  });
  actionBtns.append(favBtn);

  const attendBtn = document.createElement("button");
  attendBtn.type = "button";
  attendBtn.className = "sce-card__action-btn sce-card__action-btn--attend";
  function reflectAttend() {
    const att = isAttending(item);
    attendBtn.replaceChildren(iconEl(`fa-${att ? "solid" : "regular"} fa-circle-check`));
    attendBtn.classList.toggle("is-active", att);
    attendBtn.setAttribute("aria-pressed", String(att));
    attendBtn.setAttribute("aria-label", att ? `Marcar ${item.title} com a no confirmat` : `Marcar ${item.title} com a "hi vaig"`);
  }
  reflectAttend();
  attendBtn.addEventListener("click", (domEvent) => {
    domEvent.stopPropagation();
    toggleAttending(item);
    reflectAttend();
    if (onToggleAttending) onToggleAttending(item);
  });
  actionBtns.append(attendBtn);

  const body = document.createElement("div");
  body.className = "sce-card__body";
  const bodyLink = document.createElement("a");
  bodyLink.className = "sce-card__body-link";
  wireCardNavigate(bodyLink, item, onOpen);

  const text = el("div", "sce-card__text");
  text.append(el("p", "sce-card__title", item.title));
  if (item.speakers && item.speakers.length) {
    const names = item.speakers.slice(0, 2).map((speaker) => speaker.name).join(" · ");
    const suffix = item.speakers.length > 2 ? ` + ${item.speakers.length - 2}` : "";
    text.append(el("p", "sce-card__speakers", `${names}${suffix}`));
  }
  bodyLink.append(text);

  const timeLine = el("p", "sce-card__time");
  timeLine.append(iconEl("fa-solid fa-calendar-day"), document.createTextNode(" " + formatEventDateTime(item)));
  const metaRow = el("div", "sce-card__meta-row");
  metaRow.append(timeLine, actionBtns);
  body.append(bodyLink, metaRow);

  const details = el("div", "sce-card__details");
  if (item.venue && !hideVenue) {
    const venueLine = el("p", "sce-card__venue");
    venueLine.append(iconEl("fa-solid fa-location-dot"));
    const venueText = el("span", "sce-card__venue-text");
    venueText.append(el("span", "sce-card__venue-name", item.venue.name));
    if (item.venue.zone) venueText.append(el("span", "sce-card__venue-zone", item.venue.zone));
    venueLine.append(venueText);
    details.append(venueLine);
  }

  if (item.tracks && item.tracks.length) {
    details.append(el("p", "sce-card__tracks", item.tracks.map((t) => t.name).join(" · ")));
  }

  if (wallClock) {
    const { node } = statusPill(item, wallClock, startingSoonMinutes);
    node.classList.add("sce-card__status");
    details.append(node);
  }
  body.append(details);
  card.append(top, body);

  return card;
}

/** Grup de sessions per espai — capçalera amb nom, zona i comptador. */
export function renderVenueGroup(group, opts) {
  const wrap = el("section", "sce-venue-group");
  const header = el("div", "sce-venue-group__header");
  header.append(el("p", "sce-venue-group__title", group.venue ? group.venue.name : "Espai per confirmar"));

  const bits = [];
  if (group.venue && group.venue.zone) bits.push(group.venue.zone);
  bits.push(`${group.events.length} ${group.events.length === 1 ? "sessió" : "sessions"}`);
  header.append(el("p", "sce-venue-group__meta", bits.join(" · ")));
  wrap.append(header);

  const list = el("div", "sce-venue-group__list");
  for (const item of group.events) {
    list.append(renderEventCard(item, { ...opts, hideVenue: true }));
  }
  wrap.append(list);
  return wrap;
}

function fitxaLocationBlock(item) {
  const wrap = el("div", "sce-fitxa__block");
  wrap.append(sectionHeading("fa-solid fa-calendar-days", "Quan i on"));
  wrap.append(el("p", "ds-text", formatEventDateTime(item)));

  if (!item.venue) {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "Espai encara pendent de confirmar."));
  } else {
    wrap.append(el("p", "sce-fitxa__venue-name", item.venue.name));
    const bits = [item.venue.zone, item.venue.address].filter(Boolean);
    if (bits.length) wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", bits.join(" · ")));
  }
  return wrap;
}

function fitxaThemesBlock(item) {
  const wrap = el("div", "sce-fitxa__block");
  wrap.append(sectionHeading("fa-solid fa-tags", "Format, temàtiques i accés"));
  wrap.append(el("p", "ds-text", `Format: ${item.format || "—"}`));
  const tags = el("div", "sce-fitxa__tags");
  if (item.tracks && item.tracks.length) {
    for (const t of item.tracks) tags.append(el("span", "ds-badge ds-badge--sm ds-badge--neutral", t.name));
  } else {
    tags.append(el("span", "ds-text ds-text--sm ds-text--muted", "Sense temàtica assignada."));
  }
  wrap.append(tags);
  const access = el("p", "ds-text ds-text--sm");
  access.append(accessBadge(item));
  if (item.accessRaw) access.append(document.createTextNode(` (font: «${item.accessRaw}»)`));
  wrap.append(access);
  return wrap;
}

const SPEAKERS_COLLAPSE_AFTER = 5;

function speakerLi(sp) {
  const li = document.createElement("li");
  li.append(el("strong", null, sp.name));
  if (sp.role) li.append(document.createTextNode(` — ${sp.role}`));
  return li;
}

function fitxaSpeakersBlock(item) {
  const speakers = item.speakers || [];
  if (!speakers.length) return null;
  const wrap = el("div", "sce-fitxa__block");
  wrap.append(sectionHeading("fa-solid fa-user-group", `Ponents (${speakers.length})`));
  const list = el("ul", "sce-fitxa__speakers");
  speakers.slice(0, SPEAKERS_COLLAPSE_AFTER).forEach((sp) => list.append(speakerLi(sp)));
  wrap.append(list);
  if (speakers.length > SPEAKERS_COLLAPSE_AFTER) {
    const details = el("details", "sce-fitxa__more");
    details.append(el("summary", null, `Mostra els ${speakers.length - SPEAKERS_COLLAPSE_AFTER} ponents restants`));
    const rest = el("ul", "sce-fitxa__speakers");
    speakers.slice(SPEAKERS_COLLAPSE_AFTER).forEach((sp) => rest.append(speakerLi(sp)));
    details.append(rest);
    wrap.append(details);
  }
  return wrap;
}

function fitxaSourcesBlock(item) {
  const wrap = el("div", "sce-fitxa__block");
  wrap.append(sectionHeading("fa-solid fa-shield-check", "Font i verificació"));
  if (item.sourceUrl) {
    const a = document.createElement("a");
    a.href = item.sourceUrl;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "ds-text ds-text--sm";
    a.style.display = "block";
    a.textContent = item.sourceUrl;
    wrap.append(a);
  }
  if (item.retrievalMethod) {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", `Mètode d'obtenció: ${item.retrievalMethod}`));
  }
  if (item.notesCa) wrap.append(el("p", "ds-text ds-text--sm", item.notesCa));
  return wrap;
}

// Text oficial de la sessió (camp `description`); es respecten els salts
// de paràgraf originals (separats per línia en blanc).
function fitxaDescriptionBlock(item) {
  const wrap = el("div", "sce-fitxa__description");
  if (!item.description) {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "La font oficial no inclou descripció d'aquesta sessió."));
    return wrap;
  }
  item.description.split(/\n{2,}/).forEach((para) => {
    const trimmed = para.trim();
    if (trimmed) wrap.append(el("p", "ds-text", trimmed));
  });
  return wrap;
}

/**
 * Contingut complet de la fitxa d'una sessió, reutilitzat tant per
 * fitxa.html (pàgina pròpia, accessible per URL) com pel modal obert
 * des de les altres pantalles.
 */
export function buildFitxaCard(item, mods) {
  const card = el("div", "sce-fitxa-card");

  const bullets = el("div", "sce-fitxa__bullets");
  bullets.append(formatBadge(item.format));

  const wc = mods.state.getPlanMode() === "planificar"
    ? mods.status.planAsEventWallClock(mods.state.getPlanDateTime().date, mods.state.getPlanDateTime().time)
    : mods.status.nowAsEventWallClock();
  const prefs = mods.state.getPrefs();
  bullets.append(statusPill(item, wc, prefs.startingSoonMinutes).node);
  bullets.append(el("span", "sce-fitxa__bullets-spacer"));

  const attendBtn = document.createElement("button");
  attendBtn.type = "button";
  attendBtn.className = "sce-fitxa__bullet-btn sce-fitxa__bullet-btn--attend";
  function reflectAttend() {
    const a = isAttending(item);
    attendBtn.replaceChildren(iconEl("fa-solid fa-circle-check"));
    attendBtn.classList.toggle("is-active", a);
    attendBtn.setAttribute("aria-pressed", String(a));
    attendBtn.setAttribute("aria-label", a ? "Marcat com a 'hi vaig'" : "Marca com a 'hi vaig'");
  }
  attendBtn.addEventListener("click", () => { toggleAttending(item); reflectAttend(); });
  reflectAttend();
  bullets.append(attendBtn);

  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "sce-fitxa__bullet-btn sce-fitxa__bullet-btn--fav";
  function reflectFav() {
    const fav = isFavorite(item);
    favBtn.replaceChildren(iconEl(`fa-${fav ? "solid" : "regular"} fa-star`));
    favBtn.classList.toggle("is-active", fav);
    favBtn.setAttribute("aria-pressed", String(fav));
    favBtn.setAttribute("aria-label", fav ? "Treure de preferits" : "Afegir a preferits");
  }
  favBtn.addEventListener("click", () => { toggleFavorite(item); reflectFav(); });
  reflectFav();
  bullets.append(favBtn);
  card.append(bullets);

  card.append(el("h1", "sce-fitxa__title", item.title));
  card.append(fitxaDescriptionBlock(item));

  if (item.sourceUrl) {
    const actions = el("div", "sce-fitxa__actions");
    const officialBtn = document.createElement("a");
    officialBtn.className = "ds-button ds-button--ghost";
    officialBtn.href = item.sourceUrl;
    officialBtn.target = "_blank";
    officialBtn.rel = "noopener";
    officialBtn.setAttribute("data-no-router", "");
    officialBtn.append(iconEl("fa-solid fa-arrow-up-right-from-square"), document.createTextNode(" Font oficial"));
    actions.append(officialBtn);
    card.append(actions);
  }

  card.append(el("hr", "sce-fitxa__divider"));
  card.append(fitxaLocationBlock(item));
  card.append(el("hr", "sce-fitxa__divider"));
  card.append(fitxaThemesBlock(item));
  const speakers = fitxaSpeakersBlock(item);
  if (speakers) {
    card.append(el("hr", "sce-fitxa__divider"));
    card.append(speakers);
  }
  card.append(el("hr", "sce-fitxa__divider"));
  card.append(fitxaSourcesBlock(item));

  return card;
}

export function emptyState(message, icon = "fa-solid fa-inbox", action = null) {
  const wrap = el("div", "ds-empty");
  wrap.append(iconEl(`ds-empty__icon ${icon}`));
  wrap.append(el("p", "ds-empty__desc", message));
  if (action) {
    const link = document.createElement(action.onClick ? "button" : "a");
    link.className = "ds-button ds-button--primary ds-empty__action";
    if (action.onClick) { link.type = "button"; link.addEventListener("click", action.onClick); }
    else link.href = action.href;
    link.append(iconEl(action.icon || "fa-solid fa-arrow-right"), document.createTextNode(" " + action.label));
    wrap.append(link);
  }
  return wrap;
}
