import type { APIRoute } from "astro";
import { backTo, withError } from "../../../lib/admin-redirect.js";
import { parseDesign, removeClubBlade, setClubBlade } from "../../../lib/blades.js";
import { blobsStore } from "../../../lib/store.js";

const BACK = "/admin/blades";

// Other clubs' blades. Admin only (see middleware).
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const back = backTo(form.get("back"), BACK);
  const name = field("name");
  if (!name) return redirect(withError(back, "Pick a club."), 303);
  const store = blobsStore();
  const data = await store.getBlades();

  if (field("action") === "remove") {
    await store.putBlades(removeClubBlade(data, name));
    return redirect(back, 303);
  }
  const design = parseDesign({
    pattern: field("pattern"),
    base: field("base"),
    accent: field("accent"),
  });
  if (!design) return redirect(withError(back, "Pick a pattern and two colors."), 303);
  await store.putBlades(setClubBlade(data, name, design));
  return redirect(back, 303);
};
