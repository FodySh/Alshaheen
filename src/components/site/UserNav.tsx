import Link from "next/link";
import { getSessionUser, isStaff } from "@/lib/auth";

export async function UserNav() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn btn-quiet">
          دخول
        </Link>
        <Link href="/register" className="btn btn-primary btn-sm hidden sm:inline-flex">
          حساب جديد
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {isStaff(user) && (
        <Link href="/dashboard" className="btn btn-secondary btn-sm">
          لوحة المكتب
        </Link>
      )}
      <Link href="/account" className="btn btn-quiet">
        حسابي
      </Link>
    </div>
  );
}

export function UserNavFallback() {
  return <div className="h-9 w-24 rounded bg-sand/70" aria-hidden />;
}
