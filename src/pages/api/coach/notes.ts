import type { APIRoute } from "astro";
import { backTo } from "../../../lib/admin-redirect.js";
import { setNote } from "../../../lib/notes.js";
import { blobsStore } from "../../../lib/store.js";

// Sets or clears a coach's note on a regatta or one of its events. Coaches and admins only.
export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const store = blobsStore();
  if (await store.get(id)) {
    const notes = await store.getNotes(id);
    await store.putNotes(
      id,
      setNote(
        notes,
        String(form.get("event") ?? ""),
        String(form.get("text") ?? ""),
        locals.role === "admin" ? "admin" : "coach",
      ),
    );
  }
  return redirect(backTo(form.get("back"), `/regatta/${id}`), 303);
};
