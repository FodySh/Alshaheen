import Link from "next/link";
import { RoshanMark } from "@/components/brand/Roshan";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <RoshanMark className="h-16 w-auto opacity-60" />
      <h1 className="mt-6 font-display text-3xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-3 max-w-md text-ink-soft">ربما انتهى ترخيص إعلان هذا العرض أو أُغلق، أو أن الرابط غير صحيح.</p>
      <div className="mt-6 flex gap-2">
        <Link href="/listings" className="btn btn-primary">تصفح العروض</Link>
        <Link href="/" className="btn btn-secondary">الرئيسية</Link>
      </div>
    </main>
  );
}
