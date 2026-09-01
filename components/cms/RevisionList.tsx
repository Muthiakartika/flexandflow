"use client";

import { useTransition, useState } from "react";

import { restoreContentRevision, type CmsResult } from "@/lib/cms/actions";
import type { RevisionSummary } from "@/lib/cms/admin";

const format = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Every saved version of this page.
 *
 * Free, because revisions are append-only rows rather than in-place edits —
 * and worth surfacing, because "put it back the way it was" is the request an
 * owner makes about their own website more than any other.
 *
 * Restoring never rewrites history: it copies an old version forward as a new
 * draft, so the thing being replaced is still there afterwards. The live page
 * does not move until somebody publishes.
 */
export function RevisionList({
  docId,
  revisions,
}: {
  docId: string;
  revisions: RevisionSummary[];
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CmsResult | null>(null);

  if (revisions.length <= 1) return null;

  return (
    <section className="admin-card mt-5">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-[15px] font-bold text-ink">History</h2>
        <p className="mt-1 text-[13px] text-muted">
          Restoring copies an old version forward as a new draft. Nothing is
          overwritten, and the live page only changes when you publish.
        </p>
      </div>

      <div className="p-4">
        <ul className="grid gap-1.5">
          {revisions.map((revision) => (
            <li
              key={revision.version}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 py-2 last:border-b-0"
            >
              <span className="min-w-0">
                <span className="text-[13px] font-bold text-ink">
                  Version {revision.version}
                </span>
                {revision.isDraft ? (
                  <span className="ml-2 admin-chip bg-cream text-muted">
                    current draft
                  </span>
                ) : null}
                {revision.isPublished ? (
                  <span className="ml-2 admin-chip bg-ok-soft text-ok">live</span>
                ) : null}
                <span className="mt-0.5 block text-[12px] text-faint">
                  {format.format(revision.createdAt)}
                  {revision.author ? ` · ${revision.author}` : ""}
                </span>
              </span>

              {revision.isDraft ? null : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setResult(
                        await restoreContentRevision(docId, revision.version),
                      );
                    })
                  }
                  className="admin-btn admin-btn-quiet"
                >
                  {pending ? "Working…" : "Restore"}
                </button>
              )}
            </li>
          ))}
        </ul>

        {result?.message ? (
          <p
            role="status"
            className={`mt-3 rounded-[8px] px-3 py-2 text-[13px] font-bold ${
              result.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
            }`}
          >
            {result.message}
            {result.ok ? " Reload the page to see it in the editor." : ""}
          </p>
        ) : null}
      </div>
    </section>
  );
}
