import { JEDDAH_DISTRICTS, PROPERTY_GROUPS, PROPERTY_TYPE_LABEL } from "@/lib/constants";
import { SearchIcon } from "../icons";

type Values = { type?: string; purpose?: string; district?: string };

function Segment({ label, children, first = false }: { label: string; children: React.ReactNode; first?: boolean }) {
  return (
    <label
      className={`relative block cursor-pointer rounded-2xl px-5 py-2.5 md:rounded-full md:px-6 transition-colors hover:bg-sand has-[select:focus-visible]:bg-sand has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-ink ${
        first ? "" : "md:before:absolute md:before:inset-y-3 md:before:start-0 md:before:w-px md:before:bg-sand-deep"
      }`}
    >
      <span className="block text-xs font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

const bare = "-ms-0.5 block w-full cursor-pointer appearance-none truncate bg-transparent text-sm text-ink-soft focus-visible:outline-none";

/** أقسام البحث الثلاثة (الغرض، النوع، الحي) داخل شريط كبسولي ينتهي بزر بحث دائري */
export function SearchPill({ values = {}, districts, children }: { values?: Values; districts?: string[]; children?: React.ReactNode }) {
  const list = values.district && districts && !districts.includes(values.district) ? [values.district, ...districts] : districts ?? JEDDAH_DISTRICTS;
  return (
    <div className="search-lift grid rounded-[1.75rem] border border-sand-deep bg-white p-1.5 shadow-[var(--shadow-air)] md:grid-cols-[1fr_1fr_1.2fr_auto] md:items-center md:rounded-full">
      <Segment label="الغرض" first>
        <select name="purpose" defaultValue={values.purpose ?? ""} className={bare}>
          <option value="">بيع أو إيجار</option>
          <option value="sale">للبيع</option>
          <option value="rent">للإيجار</option>
        </select>
      </Segment>
      <Segment label="نوع العقار">
        <select name="type" defaultValue={values.type ?? ""} className={bare}>
          <option value="">كل الأنواع</option>
          {PROPERTY_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.types.map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABEL[t]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Segment>
      <Segment label="الحي">
        <select name="district" defaultValue={values.district ?? ""} className={bare}>
          <option value="">كل أحياء جدة</option>
          {list.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Segment>
      {children}
      <button
        type="submit"
        className="mt-1.5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-olive px-5 font-medium text-white hover:bg-olive-deep md:mt-0 md:ms-1 md:w-12 md:px-0"
      >
        <SearchIcon className="size-5" />
        <span className="md:sr-only">ابحث</span>
      </button>
    </div>
  );
}

/** نموذج البحث المختصر (الصفحة الرئيسية) */
export function QuickSearch({ values = {}, districts }: { values?: Values; districts?: string[] }) {
  return (
    <form action="/listings" aria-label="ابحث عن عقار">
      <SearchPill values={values} districts={districts} />
    </form>
  );
}
