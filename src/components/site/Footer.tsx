import Link from "next/link";
import { getOfficeSettings } from "@/lib/data/public";
import { whatsappLink } from "@/lib/format";
import { RoshanMark } from "../brand/Roshan";

export async function Footer() {
  const s = await getOfficeSettings();
  return (
    <footer className="mt-24 border-t border-sand-deep bg-sand/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <RoshanMark className="h-10 w-auto" />
            <p className="font-display text-xl font-bold">{s.office_name}</p>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-ink-soft">
            {s.about ?? "نسوّق عقارات جدة ونديرها: بيع وإيجار للسكني والتجاري والأراضي والعمائر."}
          </p>
          <dl className="mt-5 grid gap-1 text-sm text-ink-soft">
            {s.fal_license_number && (
              <div className="flex gap-2">
                <dt>رخصة فال:</dt>
                <dd className="num font-medium text-ink">{s.fal_license_number}</dd>
              </div>
            )}
            {s.cr_number && (
              <div className="flex gap-2">
                <dt>السجل التجاري:</dt>
                <dd className="num font-medium text-ink">{s.cr_number}</dd>
              </div>
            )}
            {s.address && <dd>{s.address}</dd>}
          </dl>
        </div>
        <div>
          <p className="font-semibold">تواصل</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {s.phone && (
              <li>
                <a href={`tel:${s.phone}`} className="num hover:text-olive-deep" dir="ltr">
                  {s.phone}
                </a>
              </li>
            )}
            {s.whatsapp && (
              <li>
                <a href={whatsappLink(s.whatsapp)} className="hover:text-olive-deep" target="_blank" rel="noopener noreferrer">
                  واتساب
                </a>
              </li>
            )}
            {s.email && (
              <li>
                <a href={`mailto:${s.email}`} className="hover:text-olive-deep" dir="ltr">
                  {s.email}
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <p className="font-semibold">روابط</p>
          <ul className="mt-3 grid gap-2 text-sm">
            <li><Link href="/listings" className="hover:text-olive-deep">جميع العروض</Link></li>
            <li><Link href="/submit" className="hover:text-olive-deep">اعرض عقارك علينا</Link></li>
            <li><Link href="/complaints" className="hover:text-olive-deep">الشكاوى والملاحظات</Link></li>
            <li><Link href="/account" className="hover:text-olive-deep">حسابي</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
