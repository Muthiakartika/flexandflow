"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE } from "@/lib/admin/action-state";
import { restoreIntakeFieldAction } from "@/lib/intake/actions";

export function RestoreIntakeFieldButton({ id, label }: { id: string; label: string }) {
  const [state, action] = useActionState(restoreIntakeFieldAction, IDLE);
  return <form action={action} className="flex flex-wrap items-center gap-3 py-2">
    <input type="hidden" name="id" value={id} />
    <span className="flex-1">{label}</span>
    <SubmitButton variant="quiet" pendingLabel="Restoring…">Restore field</SubmitButton>
    <FormMessage state={state} />
  </form>;
}
