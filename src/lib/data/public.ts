import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "../supabase/public";
import { isSupabaseConfigured } from "../supabase/env";
import type { DealPurpose, Listing, ListingImage, OfficeSettings, PropertyType } from "../types";

export const DEFAULT_SETTINGS: OfficeSettings = {
  office_name: "الشاهين لإدارة الأملاك",
  fal_license_number: null,
  cr_number: null,
  phone: "0544840940",
  whatsapp: "0544840940",
  email: null,
  address: "جدة، المملكة العربية السعودية",
  about: null,
};

export async function getOfficeSettings(): Promise<OfficeSettings> {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;
  const { data, error } = await createPublicClient()
    .from("office_settings")
    .select("office_name, fal_license_number, cr_number, phone, whatsapp, email, address, about")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return data as OfficeSettings;
}

export type ListingFilters = {
  type?: PropertyType;
  purpose?: DealPurpose;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  bedrooms?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
};

export const PAGE_SIZE = 12;

export type ListingCardData = Pick<
  Listing,
  | "id"
  | "ref_no"
  | "title"
  | "property_type"
  | "purpose"
  | "district"
  | "area_sqm"
  | "bedrooms"
  | "bathrooms"
  | "price"
  | "rent_period"
  | "cover_image_path"
  | "published_at"
>;

const CARD_COLUMNS =
  "id, ref_no, title, property_type, purpose, district, area_sqm, bedrooms, bathrooms, price, rent_period, cover_image_path, published_at";

export async function getLiveListings(filters: ListingFilters): Promise<{ items: ListingCardData[]; total: number }> {
  "use cache";
  cacheTag("listings");
  cacheLife("minutes");
  if (!isSupabaseConfigured()) return { items: [], total: 0 };

  const page = Math.max(1, filters.page ?? 1);
  let q = createPublicClient().from("listings").select(CARD_COLUMNS, { count: "exact" }).eq("status", "published");

  if (filters.type) q = q.eq("property_type", filters.type);
  if (filters.purpose) q = q.eq("purpose", filters.purpose);
  if (filters.district) q = q.eq("district", filters.district);
  if (filters.minPrice) q = q.gte("price", filters.minPrice);
  if (filters.maxPrice) q = q.lte("price", filters.maxPrice);
  if (filters.minArea) q = q.gte("area_sqm", filters.minArea);
  if (filters.bedrooms) q = q.gte("bedrooms", filters.bedrooms);

  if (filters.sort === "price_asc") q = q.order("price", { ascending: true });
  else if (filters.sort === "price_desc") q = q.order("price", { ascending: false });
  else q = q.order("published_at", { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  if (error) {
    console.error("[listings]", error.message);
    return { items: [], total: 0 };
  }
  return { items: (data ?? []) as ListingCardData[], total: count ?? 0 };
}

export async function getLiveListing(id: string): Promise<{ listing: Listing; images: ListingImage[] } | null> {
  "use cache";
  cacheTag("listings", `listing-${id}`);
  cacheLife("minutes");
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = createPublicClient();
  const { data: listing } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (!listing) return null;
  const { data: images } = await supabase
    .from("listing_images")
    .select("id, listing_id, storage_path, sort_order")
    .eq("listing_id", id)
    .order("sort_order");
  return { listing: listing as Listing, images: (images ?? []) as ListingImage[] };
}

/** الأحياء التي فيها عروض منشورة — لقائمة التصفية */
export async function getLiveDistricts(): Promise<string[]> {
  "use cache";
  cacheTag("listings");
  cacheLife("minutes");
  if (!isSupabaseConfigured()) return [];
  const { data } = await createPublicClient().from("listings").select("district").eq("status", "published").limit(1000);
  return [...new Set((data ?? []).map((r: { district: string }) => r.district))].sort((a, b) => a.localeCompare(b, "ar"));
}
