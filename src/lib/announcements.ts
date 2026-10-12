// Short messages from coaches and admins, shown as a banner and optionally sent as a push.
// One-way on purpose: see "In-app messaging" in docs/ROADMAP.md.

export interface Announcement {
  id: string;
  text: string;
  // "coach" or "admin". There are no personal logins, so this is all we know.
  from: string;
  postedAt: string;
  expiresAt: string;
}

export const MAX_ANNOUNCEMENT = 280;
// Long enough for a race weekend.
export const EXPIRY_HOURS = [4, 12, 24, 72] as const;
// Older ones drop off, so the banner and the stored list stay short.
const KEEP = 5;

export function parseAnnouncements(value: unknown): Announcement[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is Announcement =>
      !!a &&
      ["id", "text", "from", "postedAt", "expiresAt"].every(
        (k) => typeof (a as Record<string, unknown>)[k] === "string",
      ),
  );
}

export function active(list: Announcement[], now: Date = new Date()): Announcement[] {
  return list
    .filter((a) => new Date(a.expiresAt).getTime() > now.getTime())
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

/** Adds an announcement, dropping expired ones. Returns null if the text is blank. */
export function post(
  list: Announcement[],
  input: { text: string; from: string; hours: number },
  now: Date = new Date(),
): { list: Announcement[]; announcement: Announcement } | null {
  const text = input.text.replace(/\s+/g, " ").trim().slice(0, MAX_ANNOUNCEMENT);
  if (!text) return null;
  const hours = (EXPIRY_HOURS as readonly number[]).includes(input.hours) ? input.hours : 12;
  const announcement: Announcement = {
    id: `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    text,
    from: input.from,
    postedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + hours * 3_600_000).toISOString(),
  };
  return { list: [announcement, ...active(list, now)].slice(0, KEEP), announcement };
}

export function remove(list: Announcement[], id: string): Announcement[] {
  return list.filter((a) => a.id !== id);
}
