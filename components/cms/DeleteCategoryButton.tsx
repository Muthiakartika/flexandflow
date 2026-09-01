"use client";

import { useActionState, useEffect, useState } from "react";

import { SubmitButton } from "@/components/admin/SubmitButton";
import { deleteCategoryAction } from "@/lib/cms/category-actions";
import type { CmsResult } from "@/lib/cms/actions";

const IDLE: CmsResult = { ok: false, message: null };
const DISARM_AFTER_MS = 5000;

/**
 * Removes a category. Two presses, disarming on its own — the same shape as
 * every other destructive control in this panel.
 *
 * The server refuses outright while the category still holds pages, and for
 * the treatments' own prefix. This only decides what to draw.
 */
export function DeleteCategoryButton({
  id,
  label,
  postCount,
  locked,
}: {
  id: string;
  label: string;
  postCount: number;
  locked: boolean;
}) {
  const [state, action] = useActionState<CmsResult, FormData>(
    deleteCategoryAction,
    IDLE,
  );
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), DISARM_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  if (locked) {
    return <span className="text-[12px] text-faint">Cannot be removed</span>;
  }

  if (postCount > 0) {
    return (
      <span className="text-[12px] text-faint">
        Holds {postCount} page{postCount === 1 ? "" : "s"}
      </span>
    );
  }

  const refused = !state.ok && state.message !== null;

  return armed ? (
    <form action={action} className="grid justify-items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingLabel="Removing…">
        Remove {label}?
      </SubmitButton>
      {refused ? (
        <p className="max-w-[30ch] text-right text-[12px] text-danger">
          {state.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="text-[12px] text-faint underline underline-offset-2"
      >
        Keep it
      </button>
    </form>
  ) : (
    <button
      type="button"
      onClick={() => setArmed(true)}
      className="text-[13px] text-faint underline underline-offset-2 hover:text-danger"
    >
      Remove
    </button>
  );
}
