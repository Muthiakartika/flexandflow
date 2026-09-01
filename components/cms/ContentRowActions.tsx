"use client";

import { useEffect, useState, useTransition } from "react";

import {
  deleteContent,
  reorderContent,
  type CmsResult,
} from "@/lib/cms/actions";

/**
 * Reorder and delete, from the row.
 *
 * Delete arms on the first press and disarms itself after a few seconds — the
 * same shape as every other destructive control in this panel, and for the
 * same reason: it sits in a dense list beside "Edit".
 *
 * A live page cannot be deleted at all; the server refuses and says why.
 * Removing an indexed URL should be two deliberate decisions — take it
 * offline, then delete it — not one mis-aimed click.
 */
const DISARM_AFTER_MS = 5000;

export function ContentRowActions({
  docId,
  title,
  isPublished,
  canDelete,
  canReorder,
  list,
}: {
  docId: string;
  title: string;
  isPublished: boolean;
  canDelete: boolean;
  canReorder: boolean;
  /** Which of the two orderings the arrows move it in. */
  list: "reading" | "grid";
}) {
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const [result, setResult] = useState<CmsResult | null>(null);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), DISARM_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  function move(direction: "up" | "down") {
    startTransition(async () => {
      setResult(await reorderContent(docId, direction, list));
    });
  }

  return (
    <div className="grid justify-items-end gap-1">
      <div className="flex items-center gap-1">
        {canReorder ? (
          <>
            <button
              type="button"
              onClick={() => move("up")}
              disabled={pending}
              className="cms-icon-btn"
              aria-label={`Move ${title} up`}
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move("down")}
              disabled={pending}
              className="cms-icon-btn"
              aria-label={`Move ${title} down`}
              title="Move down"
            >
              ↓
            </button>
          </>
        ) : null}

        {canDelete && !isPublished ? (
          armed ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setResult(await deleteContent(docId));
                  setArmed(false);
                })
              }
              className="admin-btn admin-btn-danger"
            >
              {pending ? "Deleting…" : "Delete?"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setArmed(true)}
              className="cms-icon-btn is-danger"
              aria-label={`Delete ${title}`}
              title="Delete"
            >
              ✕
            </button>
          )
        ) : null}
      </div>

      {result?.message && !result.ok ? (
        <p className="max-w-[28ch] text-right text-[12px] text-danger">
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
