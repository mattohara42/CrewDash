import { seriesKey } from "./history.js";

// Venue guides and club tips, written by the admin and stored in Netlify Blobs.
// None of it is rower data, but it's club-specific, so it stays out of git.

export interface Place {
  label: string;
  lat: number;
  lon: number;
}

export interface Venue {
  // Made from the name when the venue is created, and kept when it's renamed.
  id: string;
  name: string;
  courseLengthM: number | null;
  places: Place[];
  // Free text: parking, where the tent goes, what to bring.
  notes: string;
}

export interface VenueData {
  venues: Venue[];
  // seriesKey -> venue id.
  seriesVenue: Record<string, string>;
  // Shown at the bottom of the Rowing 101 page.
  clubTips: string;
  // The group chat families already use. Announcements are one-way, so this is where replies go.
  chatUrl: string;
}

export const EMPTY_VENUES: VenueData = { venues: [], seriesVenue: {}, clubTips: "", chatUrl: "" };

// Plenty for a page of tips, and keeps one bad paste from bloating every page load.
export const MAX_TEXT = 5000;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const isPlace = (p: unknown): p is Place => {
  const v = p as Partial<Place> | null;
  return !!v && typeof v.label === "string" && validLatLon(v.lat, v.lon);
};

export function parseVenueData(value: unknown): VenueData {
  const v = (value ?? {}) as Partial<VenueData>;
  const venues = Array.isArray(v.venues)
    ? v.venues
        .filter((x): x is Venue => !!x && typeof x.id === "string" && typeof x.name === "string")
        .map((x) => ({
          id: x.id,
          name: x.name,
          courseLengthM: typeof x.courseLengthM === "number" ? x.courseLengthM : null,
          places: Array.isArray(x.places) ? x.places.filter(isPlace) : [],
          notes: str(x.notes),
        }))
    : [];
  const seriesVenue =
    v.seriesVenue && typeof v.seriesVenue === "object"
      ? Object.fromEntries(Object.entries(v.seriesVenue).filter(([, id]) => typeof id === "string"))
      : {};
  return { venues, seriesVenue, clubTips: str(v.clubTips), chatUrl: safeUrl(str(v.chatUrl)) };
}

/** An https link, or "" for anything else, so a stored value can't become a javascript: link. */
export function safeUrl(text: string): string {
  try {
    const url = new URL(text.trim());
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function validLatLon(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
// Google Maps links carry the pin as !3d<lat>!4d<lon>, the view as @<lat>,<lon>, or a
// search as q=<lat>,<lon>. Plain "lat, lon" works too. The pin is the most precise.
const PATTERNS = [
  new RegExp(String.raw`!3d${NUM}!4d${NUM}`),
  new RegExp(String.raw`[?&](?:q|query|ll)=${NUM}(?:,|%2C)\s*${NUM}`),
  new RegExp(String.raw`@${NUM},${NUM}`),
  new RegExp(String.raw`^\s*${NUM}\s*,\s*${NUM}\s*$`),
];

/** Coordinates from "43.15, -77.61" or a Google Maps link, or null. */
export function parseCoordinates(text: string): { lat: number; lon: number } | null {
  for (const pattern of PATTERNS) {
    const m = pattern.exec(text);
    if (!m) continue;
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    if (validLatLon(lat, lon)) return { lat, lon };
  }
  return null;
}

/**
 * The admin's places box: one "Label: coordinates or map link" per line.
 * Returns the places, or the first line that couldn't be read.
 */
export function parsePlaces(text: string): { places: Place[] } | { error: string } {
  const places: Place[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    // "https:" isn't a label separator.
    const label = colon > 0 && !line.slice(colon).startsWith("://") ? line.slice(0, colon) : "";
    const coords = parseCoordinates(label ? line.slice(colon + 1) : line);
    if (!label.trim() || !coords) return { error: line };
    places.push({ label: label.trim(), ...coords });
  }
  return { places };
}

/** The places box text for a venue, so the admin can edit what's saved. */
export function formatPlaces(places: Place[]): string {
  return places.map((p) => `${p.label}: ${p.lat}, ${p.lon}`).join("\n");
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "venue"
  );
}

/** Adds a venue, or updates the one with the same id. New venues get an unused id. */
export function saveVenue(data: VenueData, venue: Omit<Venue, "id"> & { id?: string }): VenueData {
  const existing = venue.id && data.venues.some((v) => v.id === venue.id);
  if (existing) {
    return {
      ...data,
      venues: data.venues.map((v) => (v.id === venue.id ? { ...venue, id: v.id } : v)),
    };
  }
  const base = slugify(venue.name);
  const taken = new Set(data.venues.map((v) => v.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return { ...data, venues: [...data.venues, { ...venue, id }] };
}

/** Removes a venue and unlinks any series that pointed at it. */
export function deleteVenue(data: VenueData, id: string): VenueData {
  return {
    ...data,
    venues: data.venues.filter((v) => v.id !== id),
    seriesVenue: Object.fromEntries(Object.entries(data.seriesVenue).filter(([, v]) => v !== id)),
  };
}

/** Links a series to a venue. A blank or unknown id unlinks it. */
export function setSeriesVenue(data: VenueData, series: string, id: string): VenueData {
  const seriesVenue = { ...data.seriesVenue };
  if (data.venues.some((v) => v.id === id)) seriesVenue[seriesKey(series)] = id;
  else delete seriesVenue[seriesKey(series)];
  return { ...data, seriesVenue };
}

export function venueForSeries(data: VenueData, series: string): Venue | null {
  const id = data.seriesVenue[seriesKey(series)];
  return data.venues.find((v) => v.id === id) ?? null;
}

export function mapLinks(place: Place): { apple: string; google: string } {
  const ll = `${place.lat},${place.lon}`;
  return {
    apple: `https://maps.apple.com/?${new URLSearchParams({ ll, q: place.label })}`,
    google: `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: ll })}`,
  };
}
