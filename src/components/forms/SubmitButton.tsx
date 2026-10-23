"use client";
import { useFormStatus } from "react-dom";
import { useActionPending } from "./ActionForm";

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
  name,
  value,
  formAction,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
  formAction?: (fd: FormData) => void;
}) {
  const status = useFormStatus();
  const actionPending = useActionPending();
  const pending = status.pending || actionPending;
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending} name={name} value={value} formAction={formAction}>
      {pending ? (pendingLabel ?? "جارٍ الحفظ…") : children}
    </button>
  );
}
