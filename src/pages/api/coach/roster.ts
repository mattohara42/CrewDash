import type { APIRoute } from "astro";
import { withError } from "../../../lib/admin-redirect.js";
import {
  addRower,
  editRowers,
  findById,
  mergeRowers,
  relinkLineups,
  seasonRowers,
} from "../../../lib/roster.js";
import { blobsStore } from "../../../lib/store.js";

// Roster edits: save the season's list, carry last season's rowers over, or merge a
// duplicate. Coaches and admins only (see middleware).
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const year = /^\d{4}$/.test(field("year")) ? field("year") : String(new Date().getFullYear());
  const back = `/coach/roster?year=${year}`;
  const store = blobsStore();
  let roster = await store.getRoster();

  switch (field("action")) {
    case "save": {
      // The rows come in as parallel lists. New rows have no id.
      const all = (name: string) => form.getAll(name).map(String);
      const [ids, names, squads, roles] = [all("id"), all("name"), all("squad"), all("role")];
      const removed = new Set(all("remove"));
      roster = editRowers(
        roster,
        year,
        ids
          .map((id, i) => ({
            id,
            name: names[i] ?? "",
            squad: squads[i] ?? "",
            role: roles[i] ?? "rower",
            remove: removed.has(id),
          }))
          .filter((e) => e.id),
      );
      ids.forEach((id, i) => {
        if (id || !names[i]?.trim()) return;
        const role = roles[i] === "cox" ? "cox" : "rower";
        roster = addRower(roster, { name: names[i]!, squad: squads[i] ?? "", role }, year).roster;
      });
      break;
    }
    case "carry":
      for (const r of seasonRowers(roster, field("from"))) {
        roster = addRower(roster, { name: r.name }, year).roster;
      }
      break;
    case "merge": {
      const from = field("from");
      const into = findById(roster, field("into"));
      if (!from || !into || from === into.id) {
        return redirect(withError(back, "Choose two different rowers to merge."), 303);
      }
      // Move their seats first, so no lineup is left pointing at a rower who's gone.
      for (const record of await store.list()) {
        const lineups = await store.getLineups(record.regatta.id);
        const moved = relinkLineups(lineups, from, into.id, into.name);
        if (JSON.stringify(moved) !== JSON.stringify(lineups)) {
          await store.putLineups(record.regatta.id, moved);
        }
      }
      roster = mergeRowers(roster, from, into.id);
      break;
    }
  }
  await store.putRoster(roster);
  return redirect(back, 303);
};
