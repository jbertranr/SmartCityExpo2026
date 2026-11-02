/* ============================================================
   modules/state.js
   Preferits, assistència ("hi vaig"/"ja hi he anat") i mode
   Ara/Planificar — tot local (localStorage), vinculat a l'id de la
   sessió (una sola edició: no cal cap prefix d'edició). Sense compte
   d'usuari.
   ============================================================ */

import { readJSON, writeJSON } from "./storage.js";

const K = () => window.APP.storageKeys;

// ── Preferits / assistència (conjunts d'ids d'esdeveniment) ──
function fullId(ev) {
  return ev.id;
}

function readSet(key) {
  return new Set(readJSON(key, []));
}
function writeSet(key, set) {
  writeJSON(key, Array.from(set));
}

export function isFavorite(ev) {
  return readSet(K().favorites).has(fullId(ev));
}
export function toggleFavorite(ev) {
  const s = readSet(K().favorites);
  const id = fullId(ev);
  s.has(id) ? s.delete(id) : s.add(id);
  writeSet(K().favorites, s);
  return s.has(id);
}
export function favoriteIds() {
  return readSet(K().favorites);
}
export function setFavoriteIds(ids) {
  writeSet(K().favorites, new Set(ids));
}

// "Assistència": marca "hi vaig" / "ja hi he anat".
export function isAttending(ev) {
  return readSet(K().attendance).has(fullId(ev));
}
export function toggleAttending(ev) {
  const s = readSet(K().attendance);
  const id = fullId(ev);
  s.has(id) ? s.delete(id) : s.add(id);
  writeSet(K().attendance, s);
  return s.has(id);
}
export function attendingIds() {
  return readSet(K().attendance);
}
export function setAttendingIds(ids) {
  writeSet(K().attendance, new Set(ids));
}

// Valoració local dels ponents (0 = encara no valorat, 1–5 estrelles).
export function getSpeakerRatings() {
  return readJSON(K().speakerRatings, {});
}
export function setSpeakerRating(speakerKey, rating) {
  const ratings = getSpeakerRatings();
  if (rating === 0) delete ratings[speakerKey];
  else ratings[speakerKey] = rating;
  writeJSON(K().speakerRatings, ratings);
}

export { fullId };

// ── Mode Ara / Planificar ──
export function getPlanMode() {
  return readJSON(K().planMode, "ara");
}
export function setPlanMode(mode) {
  writeJSON(K().planMode, mode);
}
export function getPlanDateTime() {
  return readJSON(K().planDateTime, { date: window.APP.defaultPlanDate, time: "10:00" });
}
export function setPlanDateTime(dt) {
  writeJSON(K().planDateTime, dt);
}

// ── Preferències (llindar de "comença aviat"…) ──
export function getPrefs() {
  return readJSON(K().prefs, { startingSoonMinutes: window.APP.startingSoonMinutes });
}
export function setPrefs(patch) {
  writeJSON(K().prefs, { ...getPrefs(), ...patch });
}

// ── Recordatori de còpia de seguretat (vegeu backup.js) ──
export function getLastBackupAt() {
  return readJSON(K().lastBackupAt, null);
}
export function setLastBackupAt(isoString) {
  writeJSON(K().lastBackupAt, isoString);
}
