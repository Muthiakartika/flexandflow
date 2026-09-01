/**
 * Turns Draft Mode on, and sends the browser to the page it applies to.
 *
 * Preview is the **real page**, not a rendering of it: same route, same
 * components, same stylesheet, same header and footer. Next bypasses every
 * cache layer for a request carrying the draft cookie and serves that route
 * dynamically, while everyone else keeps the prerendered version — so the
 * editor sees the draft and the public sees the published page, from one URL.
 *
 * That is also why there is no separate preview route to keep in step with the
 * real one. A lookalike would drift the first time the article layout changed.
 *
 * `/api/` is **not** covered by `proxy.ts`, which only matches `/admin/*`. The
 * permission check here is the only gate, and it has to be: without it,
 * anybody could set the bypass cookie for themselves and read every unpublished
 * draft on the site.
 */
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

import { actingAdmin } from "@/lib/admin/auth";
import { loadEditorDoc } from "@/lib/cms/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  /* Leaving preview needs no permission — somebody whose access was revoked
     mid-session must still be able to get the cookie off their browser. */
  if (url.searchParams.get("exit") !== null) {
    (await draftMode()).disable();
    redirect(url.searchParams.get("to") || "/");
  }

  if (!(await actingAdmin("content.view"))) {
    /* 404, not 403. Confirming that this endpoint exists to an anonymous
       caller tells them where to start guessing. */
    return new Response("Not found", { status: 404 });
  }

  const id = url.searchParams.get("id");
  if (!id) return new Response("No page named", { status: 400 });

  const doc = await loadEditorDoc(id);
  if (!doc) return new Response("Not found", { status: 404 });

  (await draftMode()).enable();

  /* Built from the document that was just loaded, never from a query
     parameter. Redirecting to a caller-supplied path would make this an open
     redirect that happens to hand out a privileged cookie on the way. */
  redirect(`/${doc.urlPrefix}/${doc.slug}/`);
}
