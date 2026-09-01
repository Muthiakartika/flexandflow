/**
 * The image upload and library endpoint.
 *
 * A route handler rather than a server action because the browser sends a
 * `File`, and the picker wants the progress and the error of a real request
 * rather than a form submission it has to model.
 *
 * It sits under `/api/`, which `proxy.ts` does **not** match — that only
 * covers `/admin/*`. So the permission check here is the only gate, and both
 * methods do it. An upload endpoint reachable without one is a free file host
 * on the studio's own domain.
 */
import { actingAdmin } from "@/lib/admin/auth";
import { listAssets, storeUpload } from "@/lib/cms/media";
import { fail, ok, serverError } from "@/lib/api/respond";

export const dynamic = "force-dynamic";
/* Reading the file into memory and passing it through sharp is past what the
   Edge runtime offers; sharp is a native module. */
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (!(await actingAdmin("content.view"))) {
    return fail("NOT_FOUND", "Not found.");
  }

  const search = new URL(request.url).searchParams.get("q") ?? undefined;

  try {
    return ok({ assets: await listAssets(search) });
  } catch (error) {
    console.error("[cms] could not list media", error);
    return serverError("The image library could not be read.");
  }
}

export async function POST(request: Request): Promise<Response> {
  const admin = await actingAdmin("media.upload");

  /* 404 rather than 403 for someone with no session at all: the existence of
     this endpoint is not worth confirming to an anonymous caller. */
  if (!admin) return fail("NOT_FOUND", "Not found.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("VALIDATION", "That upload could not be read. Try again.");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("VALIDATION", "Choose an image to upload.");
  }

  const alt = form.get("alt");

  try {
    const result = await storeUpload(
      file,
      admin.id,
      typeof alt === "string" ? alt.trim() : "",
    );

    if (!result.ok) return fail("VALIDATION", result.message);

    return ok({
      asset: result.asset,
      /* The picker says so out loud. Silently handing back a different file
         than the one just chosen looks like the upload failed. */
      reused: result.reused,
    });
  } catch (error) {
    console.error("[cms] upload failed", error);
    return serverError(
      "The image could not be saved. If this keeps happening, the storage " +
        "settings may be wrong.",
    );
  }
}
