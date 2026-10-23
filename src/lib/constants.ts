import type {
  BookingStatus,
  ContractKind,
  ContractParty,
  ContractStatus,
  PaymentFrequency,
  ComplaintStatus,
  DealPurpose,
  InquiryStatus,
  ListingStatus,
  PropertyType,
  RentPeriod,
  RequestFileKind,
  RequestStatus,
  SubmitterCapacity,
  UserRole,
} from "./types";

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  apartment: "شقة",
  villa: "فيلا",
  floor: "دور",
  duplex: "دوبلكس",
  townhouse: "تاون هاوس",
  land: "أرض",
  shop: "محل تجاري",
  office: "مكتب",
  showroom: "معرض",
  warehouse: "مستودع",
  building: "عمارة",
  compound: "مجمع سكني",
};

export const PROPERTY_GROUPS: { label: string; types: PropertyType[] }[] = [
  { label: "سكني", types: ["apartment", "villa", "floor", "duplex", "townhouse"] },
  { label: "أراضٍ", types: ["land"] },
  { label: "تجاري", types: ["shop", "office", "showroom", "warehouse"] },
  { label: "استثماري", types: ["building", "compound"] },
];

export const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[];

/** الحقول التي تظهر لكل نوع */
export function fieldsFor(type: PropertyType | "" | undefined) {
  const residential = ["apartment", "villa", "floor", "duplex", "townhouse"].includes(type ?? "");
  const land = type === "land";
  const standalone = ["villa", "land", "building", "compound", "townhouse", "warehouse", "showroom"].includes(
    type ?? "",
  );
  return {
    rooms: residential,
    age: !land,
    street: standalone,
    facade: standalone,
  };
}

export const PURPOSE_LABEL: Record<DealPurpose, string> = { sale: "للبيع", rent: "للإيجار" };
export const RENT_PERIOD_LABEL: Record<RentPeriod, string> = { yearly: "سنوياً", monthly: "شهرياً" };
export const CAPACITY_LABEL: Record<SubmitterCapacity, string> = {
  owner: "مالك العقار",
  authorized_agent: "وكيل عن المالك",
};

export const FACADES = [
  "شمالية",
  "جنوبية",
  "شرقية",
  "غربية",
  "شمالية شرقية",
  "شمالية غربية",
  "جنوبية شرقية",
  "جنوبية غربية",
  "على شارعين",
  "على ثلاثة شوارع",
];

export const JEDDAH_DISTRICTS = [
  "أبحر الشمالية",
  "أبحر الجنوبية",
  "الأجواد",
  "الأمير فواز",
  "الأندلس",
  "البساتين",
  "البغدادية",
  "البلد",
  "البوادي",
  "الثغر",
  "الجامعة",
  "الحمدانية",
  "الحمراء",
  "الخالدية",
  "الربوة",
  "الرحاب",
  "الروضة",
  "الرويس",
  "الريان",
  "الزهراء",
  "السامر",
  "السلامة",
  "السليمانية",
  "الشاطئ",
  "الشراع",
  "الشرفية",
  "الصفا",
  "الصواري",
  "الفيحاء",
  "الفيصلية",
  "الكندرة",
  "اللؤلؤ",
  "المحمدية",
  "المرجان",
  "المروة",
  "النخيل",
  "النزهة",
  "النسيم",
  "النعيم",
  "النهضة",
  "الواحة",
  "الورود",
  "الياقوت",
  "أم الخير",
  "بني مالك",
  "طيبة",
  "مشرفة",
];

/** ترتيب الأحياء أبجدياً مع تجاهل "ال" في أول الاسم، ليسهل إيجاد الحي */
export function sortDistricts(list: string[]) {
  const key = (n: string) => n.trim().replace(/^ال/, "");
  return [...new Set(list.map((n) => n.trim()).filter(Boolean))].sort((a, b) => key(a).localeCompare(key(b), "ar"));
}

export const FEATURES = [
  "مصعد",
  "موقف خاص",
  "مكيفات",
  "مطبخ راكب",
  "غرفة خادمة",
  "غرفة سائق",
  "مسبح",
  "حديقة",
  "سطح خاص",
  "مدخل مستقل",
  "مؤثث",
  "حارس",
  "قريب من الخدمات",
  "إطلالة بحرية",
];

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  new: "جديد",
  under_review: "قيد المراجعة",
  awaiting_license: "بانتظار ترخيص الإعلان",
  published: "منشور",
  closed: "مغلق",
  rejected: "مرفوض",
};

/** شرح الحالة كما يراه مقدم الطلب */
export const REQUEST_STATUS_HELP: Record<RequestStatus, string> = {
  new: "استلمنا طلبك وسيُسند لأحد الوسطاء قريباً.",
  under_review: "نراجع بيانات العقار والصك، وقد نتواصل معك لاستكمال شيء.",
  awaiting_license: "نستخرج ترخيص الإعلان من الهيئة العامة للعقار قبل النشر.",
  published: "عقارك منشور الآن ونستقبل الاستفسارات وطلبات المعاينة.",
  closed: "أُغلق الطلب.",
  rejected: "لم نتمكن من قبول الطلب. السبب موضح أدناه.",
};

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "مسودة",
  published: "منشور",
  sold: "مُباع",
  rented: "مؤجَّر",
  archived: "مؤرشف",
};

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "بانتظار الرد",
  replied: "تم الرد",
  closed: "مغلق",
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "مؤكد",
  cancelled: "ملغى",
  completed: "تمت المعاينة",
  no_show: "لم يحضر",
};

export const COMPLAINT_STATUS_LABEL: Record<ComplaintStatus, string> = {
  new: "جديدة",
  in_progress: "قيد المعالجة",
  resolved: "تمت المعالجة",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  visitor: "زائر",
  agent: "وسيط",
  admin: "مدير",
};

export const FILE_KIND_LABEL: Record<RequestFileKind, string> = {
  photo: "صورة",
  deed: "الصك",
  authorization: "الوكالة",
  other: "مرفق",
};

export type Tone = "neutral" | "olive" | "clay" | "danger" | "muted";

export const REQUEST_TONE: Record<RequestStatus, Tone> = {
  new: "clay",
  under_review: "neutral",
  awaiting_license: "clay",
  published: "olive",
  closed: "muted",
  rejected: "danger",
};

export const LISTING_TONE: Record<ListingStatus, Tone> = {
  draft: "neutral",
  published: "olive",
  sold: "muted",
  rented: "muted",
  archived: "muted",
};

export const INQUIRY_TONE: Record<InquiryStatus, Tone> = { new: "clay", replied: "olive", closed: "muted" };
export const BOOKING_TONE: Record<BookingStatus, Tone> = {
  confirmed: "olive",
  cancelled: "muted",
  completed: "neutral",
  no_show: "danger",
};
export const COMPLAINT_TONE: Record<ComplaintStatus, Tone> = {
  new: "clay",
  in_progress: "neutral",
  resolved: "olive",
};

// =============================================================
// عقود الإيجار
// =============================================================
export const CONTRACT_PARTY_LABEL: Record<ContractParty, string> = {
  landlord: "المالك (المؤجر)",
  landlord_agent: "وكيل عن المالك",
  tenant: "المستأجر",
};

export const CONTRACT_KIND_LABEL: Record<ContractKind, string> = { residential: "سكني", commercial: "تجاري" };

export const PAYMENT_FREQUENCY_LABEL: Record<PaymentFrequency, string> = {
  monthly: "شهرية",
  quarterly: "ربع سنوية",
  semiannual: "نصف سنوية",
  annual: "سنوية",
};

export const CONTRACT_DURATIONS: { months: number; label: string }[] = [
  { months: 3, label: "3 أشهر" },
  { months: 6, label: "6 أشهر" },
  { months: 12, label: "سنة" },
  { months: 24, label: "سنتان" },
  { months: 36, label: "3 سنوات" },
  { months: 48, label: "4 سنوات" },
  { months: 60, label: "5 سنوات" },
];

export function durationLabel(months: number) {
  return CONTRACT_DURATIONS.find((d) => d.months === months)?.label ?? `${months} شهراً`;
}

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  awaiting_data: "بانتظار البيانات",
  sent_to_ejar: "بانتظار موافقة الطرفين في إيجار",
  documented: "موثّق",
  cancelled: "ملغى",
};

export const CONTRACT_STATUS_HELP: Record<ContractStatus, string> = {
  new: "استلمنا طلبك وسيتواصل معك أحد الوسطاء.",
  contacted: "تواصل معك الوسيط لاستكمال التفاصيل.",
  awaiting_data: "ننتظر منك بعض البيانات أو المستندات. تفاصيلها في سجل الطلب.",
  sent_to_ejar: "أنشأنا العقد في منصة إيجار. ستصل للمؤجر والمستأجر رسالة نصية للموافقة عبر نفاذ.",
  documented: "تم توثيق العقد في منصة إيجار.",
  cancelled: "أُلغي الطلب. السبب موضح في السجل.",
};

export const CONTRACT_TONE: Record<ContractStatus, Tone> = {
  new: "clay",
  contacted: "neutral",
  awaiting_data: "clay",
  sent_to_ejar: "neutral",
  documented: "olive",
  cancelled: "muted",
};

export const CONTRACT_RENEWAL_DAYS = 60;
