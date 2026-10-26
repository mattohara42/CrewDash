import { eventDate, type Regatta } from "../crewtimer/normalize.js";
import type { StoredRegatta } from "./store.js";
import { startMinutes } from "./format.js";
import { compassPoint, weatherPlace, type Venue } from "./venues.js";

// Weather on race day from Open-Meteo (free for non-commercial use, no key, attribution
// required). Past days come from its archive, recent and coming days from its forecast.

export type Units = "imperial" | "metric";

export interface Conditions {
  // Averages over the racing hours.
  windSpeed: number;
  windFrom: number;
  tempMin: number;
  tempMax: number;
  // Total over the racing hours, in inches or mm.
  rain: number;
  units: Units;
  // Forecasts can still change. Archive data won't.
  forecast: boolean;
}

export interface CachedConditions {
  conditions: Conditions | null;
  fetchedAt: string;
}

export const ATTRIBUTION = {
  text: "Weather data by Open-Meteo.com",
  url: "https://open-meteo.com/",
};

// The archive lags real time by a few days. Anything newer comes from the forecast API.
const ARCHIVE_AFTER_DAYS = 6;
const RECHECK_MS = 60 * 60_000;
const TIMEOUT_MS = 3000;

/** Racing hours on a date from the event start times, or 8 am to 5 pm. */
export function racingHours(
  record: StoredRegatta,
  date: string = record.regatta.date,
): [number, number] {
  const starts = record.regatta.events
    .filter((e) => eventDate(record.regatta, e) === date)
    .map((e) => startMinutes(e.start))
    .filter((m): m is number => m !== null);
  if (starts.length === 0) return [8, 17];
  return [
    Math.floor(Math.min(...starts) / 60),
    Math.min(23, Math.ceil(Math.max(...starts) / 60) + 1),
  ];
}

interface Hourly {
  time: string[];
  temperature_2m: (number | null)[];
  precipitation: (number | null)[];
  wind_speed_10m: (number | null)[];
  wind_direction_10m: (number | null)[];
}

/** Averages the hours from `from` to `to` (inclusive). Wind direction is averaged as a vector. */
export function summarize(
  hourly: Hourly,
  from: number,
  to: number,
  units: Units,
  forecast: boolean,
): Conditions | null {
  let n = 0;
  let speed = 0;
  let x = 0;
  let y = 0;
  let rain = 0;
  const temps: number[] = [];
  hourly.time.forEach((t, i) => {
    const hour = Number(t.slice(11, 13));
    const s = hourly.wind_speed_10m[i];
    const d = hourly.wind_direction_10m[i];
    if (hour < from || hour > to || s == null || d == null) return;
    n++;
    speed += s;
    x += s * Math.sin((d * Math.PI) / 180);
    y += s * Math.cos((d * Math.PI) / 180);
    rain += hourly.precipitation[i] ?? 0;
    const temp = hourly.temperature_2m[i];
    if (temp != null) temps.push(temp);
  });
  if (n === 0 || temps.length === 0) return null;
  return {
    windSpeed: speed / n,
    windFrom: ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360,
    tempMin: Math.min(...temps),
    tempMax: Math.max(...temps),
    rain,
    units,
    forecast,
  };
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

export async function fetchConditions(
  lat: number,
  lon: number,
  date: string,
  hours: [number, number],
  opts: { timeZone: string; units: Units; today: string; fetchImpl?: typeof fetch },
): Promise<Conditions | null> {
  const archive = daysBetween(date, opts.today) >= ARCHIVE_AFTER_DAYS;
  const host = archive
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: date,
    end_date: date,
    hourly: "temperature_2m,precipitation,wind_speed_10m,wind_direction_10m",
    timezone: opts.timeZone,
    ...(opts.units === "imperial"
      ? { wind_speed_unit: "mph", temperature_unit: "fahrenheit", precipitation_unit: "inch" }
      : {}),
  });
  const res = await (opts.fetchImpl ?? fetch)(`${host}?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const body = (await res.json()) as { hourly?: Hourly };
  return body.hourly ? summarize(body.hourly, hours[0], hours[1], opts.units, !archive) : null;
}

/** Whether a cached lookup is still good: archive data forever, anything else for an hour. */
export function isFresh(cached: CachedConditions, date: string, today: string, now: Date): boolean {
  if (cached.conditions && !cached.conditions.forecast) return true;
  if (daysBetween(date, today) >= ARCHIVE_AFTER_DAYS && cached.conditions === null) {
    return now.getTime() - Date.parse(cached.fetchedAt) < 24 * RECHECK_MS;
  }
  return now.getTime() - Date.parse(cached.fetchedAt) < RECHECK_MS;
}

export type WindOnCourse =
  "headwind" | "tailwind" | "crosswind" | "cross-headwind" | "cross-tailwind";

/** Wind relative to the direction crews row. Wind direction is where it blows from. */
export function windOnCourse(windFrom: number, courseBearing: number): WindOnCourse {
  const d = Math.abs(((((windFrom - courseBearing) % 360) + 540) % 360) - 180);
  if (d <= 30) return "headwind";
  if (d < 60) return "cross-headwind";
  if (d <= 120) return "crosswind";
  if (d < 150) return "cross-tailwind";
  return "tailwind";
}

/** "Wind 12 mph from the SW, a headwind on this course · 54–61°F · dry" */
export function describeConditions(c: Conditions, courseBearing: number | null): string {
  const speedUnit = c.units === "imperial" ? "mph" : "km/h";
  const tempUnit = c.units === "imperial" ? "°F" : "°C";
  const speed = Math.round(c.windSpeed);
  let wind =
    speed <= 2 ? "Calm" : `Wind ${speed} ${speedUnit} from the ${compassPoint(c.windFrom)}`;
  if (speed > 2 && courseBearing !== null) {
    const rel = windOnCourse(c.windFrom, courseBearing);
    wind += `, a ${rel} on this course`;
  }
  const lo = Math.round(c.tempMin);
  const hi = Math.round(c.tempMax);
  const temp = lo === hi ? `${lo}${tempUnit}` : `${lo}–${hi}${tempUnit}`;
  const rainUnit = c.units === "imperial" ? "in" : "mm";
  const wet = c.rain >= (c.units === "imperial" ? 0.01 : 0.2);
  const rain = wet
    ? `${c.rain.toFixed(c.units === "imperial" ? 2 : 1)} ${rainUnit} of rain`
    : "dry";
  return [wind, temp, rain].join(" · ");
}

/** Where one race day's conditions are cached, and their key in conditionsFor's map. */
export function conditionsKey(regatta: Pick<Regatta, "id" | "date">, date: string): string {
  // The first day keeps the plain id, so weather cached before multi-day support still counts.
  return date === regatta.date ? regatta.id : `${regatta.id}/${date}`;
}

/** Conditions for a regatta at its venue, from the cache when fresh. Never throws. */
export async function regattaConditions(
  record: StoredRegatta,
  venue: Venue | null,
  cache: {
    get(id: string): Promise<CachedConditions | null>;
    put(id: string, value: CachedConditions): Promise<void>;
  },
  opts: { timeZone: string; units: Units; today: string; now?: Date; fetchImpl?: typeof fetch },
  // Which race day. Defaults to the first.
  date: string = record.regatta.date,
): Promise<Conditions | null> {
  const place = venue ? weatherPlace(venue) : null;
  const id = conditionsKey(record.regatta, date);
  // The forecast only reaches about two weeks ahead.
  if (!place || daysBetween(opts.today, date) > 14) return null;
  const now = opts.now ?? new Date();
  try {
    const cached = await cache.get(id);
    if (cached && isFresh(cached, date, opts.today, now)) return cached.conditions;
    let conditions: Conditions | null = null;
    try {
      conditions = await fetchConditions(
        place.lat,
        place.lon,
        date,
        racingHours(record, date),
        opts,
      );
    } catch (err) {
      console.error("Weather lookup failed:", err);
    }
    // A failure is cached too, so a busy page doesn't retry on every view.
    await cache.put(id, { conditions, fetchedAt: now.toISOString() });
    return conditions;
  } catch (err) {
    console.error("Weather cache failed:", err);
    return null;
  }
}

/**
 * Looks up conditions for each regatta with a venue, in parallel. Keyed by conditionsKey,
 * which is the regatta id for its first day.
 */
export async function conditionsFor(
  items: { record: StoredRegatta; venue: Venue | null; date?: string }[],
  cache: Parameters<typeof regattaConditions>[2],
  opts: Parameters<typeof regattaConditions>[3],
): Promise<Map<string, Conditions>> {
  const found = await Promise.all(
    items.map(
      async ({ record, venue, date = record.regatta.date }) =>
        [
          conditionsKey(record.regatta, date),
          await regattaConditions(record, venue, cache, opts, date),
        ] as const,
    ),
  );
  return new Map(found.filter((f): f is readonly [string, Conditions] => f[1] !== null));
}
