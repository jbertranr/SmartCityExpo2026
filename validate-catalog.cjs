#!/usr/bin/env node
/* Valida data/*.json contra l'esquema de Smart City Expo 2026.
   Ús: node validate-catalog.cjs   (surt amb codi 1 si hi ha errors) */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "data");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));

const errors = [];
const err = (m) => errors.push(m);

const tracks = read("tracks.json").tracks;
const venues = read("venues.json").venues;
const events = read("events.json").events;
const coverage = read("coverage.json");

const ACCESS = new Set(["all-passes", "invitation-only", "no-visitor-pass", "open-side-event"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function uniqueIds(list, label) {
  const seen = new Set();
  for (const x of list) {
    if (!x.id) { err(`${label}: element sense id`); continue; }
    if (seen.has(x.id)) err(`${label}: id duplicat "${x.id}"`);
    seen.add(x.id);
  }
  return seen;
}

const trackIds = uniqueIds(tracks, "tracks");
const venueIds = uniqueIds(venues, "venues");
uniqueIds(events, "events");

for (const t of tracks) if (!t.name) err(`track ${t.id}: falta name`);
for (const v of venues) {
  if (!v.name) err(`venue ${v.id}: falta name`);
  if (!v.zone) err(`venue ${v.id}: falta zone`);
}

const realDate = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
};

for (const e of events) {
  const w = `event ${e.id}`;
  if (!e.title) err(`${w}: falta title`);
  if (!e.format) err(`${w}: falta format`);
  if (!DATE_RE.test(e.date || "") || !realDate(e.date)) err(`${w}: date invàlida "${e.date}"`);
  if (!TIME_RE.test(e.startTime || "")) err(`${w}: startTime invàlid "${e.startTime}"`);
  if (!TIME_RE.test(e.endTime || "")) err(`${w}: endTime invàlid "${e.endTime}"`);
  else if (TIME_RE.test(e.startTime || "") && e.endTime <= e.startTime) err(`${w}: endTime (${e.endTime}) ha de ser posterior a startTime (${e.startTime})`);
  if (!e.venueId || !venueIds.has(e.venueId)) err(`${w}: venueId inexistent "${e.venueId}"`);
  if (!Array.isArray(e.trackIds)) err(`${w}: trackIds ha de ser una llista`);
  else for (const t of e.trackIds) if (!trackIds.has(t)) err(`${w}: trackId inexistent "${t}"`);
  if (!ACCESS.has(e.access)) err(`${w}: access invàlid "${e.access}"`);
  if (!Array.isArray(e.speakers)) err(`${w}: speakers ha de ser una llista`);
  else e.speakers.forEach((s, i) => { if (!s.name) err(`${w}: speakers[${i}] sense name`); });
  if (!e.sourceUrl || !/^https?:\/\//.test(e.sourceUrl)) err(`${w}: sourceUrl invàlida`);
}

if (coverage.imported !== events.length) err(`coverage.imported (${coverage.imported}) ≠ nombre de sessions (${events.length})`);

if (errors.length) {
  console.error(`✗ ${errors.length} error(s):`);
  errors.slice(0, 50).forEach((m) => console.error("  - " + m));
  process.exit(1);
}
console.log(`✓ Catàleg vàlid: ${events.length} sessions, ${venues.length} espais, ${tracks.length} temàtiques.`);
