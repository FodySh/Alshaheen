import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "../brand/Wordmark";
import { MenuIcon } from "../icons";
import { UserNav, UserNavFallback } from "./UserNav";

const NAV = [
  { href: "/listings", label: "العروض" },
  { href: "/listings?purpose=sale", label: "للبيع" },
  { href: "/listings?purpose=rent", label: "للإيجار" },
  { href: "/submit", label: "اعرض عقارك" },
  { href: "/contracts", label: "توثيق العقود" },
];

export function Header() {
  return (
    <header className="border-b border-sand-deep bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80 sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:h-[4.5rem]">
        <Wordmark />
        <nav aria-label="الرئيسية" className="hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded px-3 py-2 text-[0.95rem] font-medium text-ink-soft hover:bg-sand hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1 md:ms-0">
          <Suspense fallback={<UserNavFallback />}>
            <UserNav />
          </Suspense>
          <details className="relative md:hidden">
            <summary className="btn btn-quiet list-none [&::-webkit-details-marker]:hidden" aria-label="القائمة">
              <MenuIcon className="size-5" />
            </summary>
            <nav aria-label="القائمة" className="panel absolute end-0 top-12 z-40 flex w-56 flex-col p-2 shadow-lg shadow-ink/10">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded px-3 py-2.5 hover:bg-sand">
                  {n.label}
                </Link>
              ))}
              <Link href="/complaints" className="rounded px-3 py-2.5 hover:bg-sand">
                الشكاوى والملاحظات
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
