import type { APIRoute } from "astro";
import { backTo } from "../../../lib/admin-redirect.js";
import { blobsStore } from "../../../lib/store.js";

// Sets the series a regatta belongs to. Blank goes back to the suggested name. Admin only.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const store = blobsStore();
  const record = await store.get(String(form.get("id") ?? ""));
  if (record) {
    const series = String(form.get("series") ?? "").trim();
    await store.put({ ...record, series: series || undefined });
  }
  return redirect(backTo(form.get("back")), 303);
};
