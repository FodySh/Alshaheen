import Link from "next/link";
import { RoshanMark } from "./Roshan";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-sm" aria-label="الشاهين لإدارة الأملاك — الرئيسية">
      <RoshanMark className={compact ? "h-8 w-auto" : "h-10 w-auto"} />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-bold text-ink ${compact ? "text-xl" : "text-2xl"}`}>الشاهين</span>
        <span className="mt-1 text-[0.7rem] font-medium text-ink-soft">لإدارة الأملاك</span>
      </span>
    </Link>
  );
}
