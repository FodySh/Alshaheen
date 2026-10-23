"use client";
import { createContext, useContext, useTransition } from "react";

const PendingContext = createContext(false);
export const useActionPending = () => useContext(PendingContext);

/**
 * نموذج يرسل الإجراء داخل transition بدلاً من خاصية action،
 * لأن React 19 يعيد ضبط حقول النموذج تلقائياً بعد كل إجراء، فيضيع ما كتبه
 * المستخدم عند ظهور خطأ، وتنحرف القوائم المنسدلة المتحكم بها عن قيمها.
 */
export function ActionForm({
  action,
  children,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  action: (fd: FormData) => void;
  ref?: React.Ref<HTMLFormElement>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <PendingContext.Provider value={pending}>
      <form
        {...props}
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const fd = new FormData(e.currentTarget);
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) fd.set(submitter.name, submitter.value);
          startTransition(() => action(fd));
        }}
      >
        {children}
      </form>
    </PendingContext.Provider>
  );
}
