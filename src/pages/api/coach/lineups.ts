import type { APIRoute } from "astro";
import { backTo } from "../../../lib/admin-redirect.js";
import { regattaYear } from "../../../lib/history.js";
import { MAX_SEATS, NEW_ROWER, lineupKey, setLineup, type Seat } from "../../../lib/lineups.js";
import { addRower, findById, linkLineups } from "../../../lib/roster.js";
import { blobsStore } from "../../../lib/store.js";

// Sets or clears one boat's lineup from the roster. A seat can pick a roster rower or
// name a new one, who is added to the season's roster. Coaches and admins only.
export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "");
  const id = field("id");
  const back = backTo(form.get("back"), `/regatta/${id}`);
  const store = blobsStore();
  const record = await store.get(id);
  if (!record) return redirect(back, 303);

  const season = regattaYear(record.regatta);
  let roster = await store.getRoster();
  const seatFrom = (prefix: string, role: "rower" | "cox"): Seat | null => {
    const picked = field(prefix);
    const typed = field(`${prefix}-new`);
    const sub = form.get(`${prefix}-sub`) === "on";
    let rowerId: string | null = null;
    if (picked === NEW_ROWER || (!picked && typed.trim())) {
      const added = addRower(roster, { name: typed, role }, season);
      roster = added.roster;
      rowerId = added.id;
    } else if (picked) {
      rowerId = picked;
    }
    const rower = rowerId ? findById(roster, rowerId) : undefined;
    if (!rower) return null;
    return { name: rower.name, rowerId: rower.id, ...(sub && { sub: true }) };
  };

  const count = Math.min(MAX_SEATS, Number(field("count")) || 0);
  const seats = Array.from({ length: count }, (_, i) => seatFrom(`seat${i}`, "rower"));
  const lineups = setLineup(await store.getLineups(id), lineupKey(field("event"), field("bow")), {
    seats,
    cox: seatFrom("cox", "cox"),
    from: locals.role === "admin" ? "admin" : "coach",
  });
  // Link any older typed-in seats at this regatta while we're here.
  const linked = linkLineups(roster, lineups, season);
  await store.putRoster(linked.roster);
  await store.putLineups(id, linked.lineups ?? lineups);
  return redirect(back, 303);
};
