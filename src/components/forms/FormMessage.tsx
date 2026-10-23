import type { ActionState } from "@/lib/types";
import { CheckIcon } from "../icons";

export function FormMessage({ state }: { state: ActionState | undefined | null }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="rounded-md border border-[#e3c2c2] bg-danger-tint px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.ok && state.message)
    return (
      <p role="status" className="flex items-center gap-2 rounded-md bg-olive-tint px-3 py-2 text-sm text-olive-deep">
        <CheckIcon className="size-4 shrink-0" />
        {state.message}
      </p>
    );
  return null;
}

export function FieldError({ state, name }: { state: ActionState | undefined | null; name: string }) {
  const msg = state?.fieldErrors?.[name];
  if (!msg) return null;
  return (
    <span id={`${name}-error`} className="mt-1 block text-sm text-danger">
      {msg}
    </span>
  );
}
