export type UserRole = "visitor" | "agent" | "admin";

export type PropertyType =
  | "apartment"
  | "villa"
  | "floor"
  | "duplex"
  | "townhouse"
  | "land"
  | "shop"
  | "office"
  | "showroom"
  | "warehouse"
  | "building"
  | "compound";

export type DealPurpose = "sale" | "rent";
export type RentPeriod = "yearly" | "monthly";
export type SubmitterCapacity = "owner" | "authorized_agent";
export type RequestStatus = "new" | "under_review" | "awaiting_license" | "published" | "closed" | "rejected";
export type ListingStatus = "draft" | "published" | "sold" | "rented" | "archived";
export type InquiryStatus = "new" | "replied" | "closed";
export type BookingStatus = "confirmed" | "cancelled" | "completed" | "no_show";
export type ComplaintStatus = "new" | "in_progress" | "resolved";
export type RequestFileKind = "photo" | "deed" | "authorization" | "other";

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export type OfficeSettings = {
  office_name: string;
  fal_license_number: string | null;
  cr_number: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  about: string | null;
  contract_service_fee: string | null;
};

export type PropertyFields = {
  property_type: PropertyType;
  purpose: DealPurpose;
  city: string;
  district: string;
  area_sqm: number;
  bedrooms: number | null;
  bathrooms: number | null;
  age_years: number | null;
  street_width_m: number | null;
  facade: string | null;
  rent_period: RentPeriod | null;
};

export type Listing = PropertyFields & {
  id: string;
  ref_no: number;
  request_id: string | null;
  title: string;
  description: string;
  features: string[];
  price: number;
  map_url: string | null;
  ad_license_number: string | null;
  ad_license_expiry: string | null;
  status: ListingStatus;
  agent_id: string;
  cover_image_path: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingImage = {
  id: string;
  listing_id: string;
  storage_path: string;
  sort_order: number;
};

export type MarketingRequest = PropertyFields & {
  id: string;
  ref_no: number;
  submitter_id: string;
  capacity: SubmitterCapacity;
  address_note: string | null;
  asking_price: number;
  deed_number: string;
  description: string;
  status: RequestStatus;
  assigned_to: string | null;
  rejection_reason: string | null;
  listing_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RequestFile = {
  id: string;
  request_id: string;
  kind: RequestFileKind;
  storage_path: string;
  file_name: string | null;
  created_at: string;
};

export type RequestEvent = {
  id: string;
  request_id: string;
  actor_id: string | null;
  from_status: RequestStatus | null;
  to_status: RequestStatus | null;
  note: string | null;
  is_internal: boolean;
  created_at: string;
};

export type Inquiry = {
  id: string;
  ref_no: number;
  listing_id: string;
  user_id: string;
  message: string;
  status: InquiryStatus;
  reply: string | null;
  replied_at: string | null;
  assigned_to: string | null;
  created_at: string;
};

export type Slot = {
  id: string;
  agent_id: string;
  starts_at: string;
  ends_at: string;
};

export type Booking = {
  id: string;
  ref_no: number;
  listing_id: string;
  slot_id: string | null;
  visitor_id: string;
  agent_id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  visitor_note: string | null;
  office_note: string | null;
  created_at: string;
};

export type Complaint = {
  id: string;
  ref_no: number;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  listing_ref: string | null;
  subject: string;
  body: string;
  status: ComplaintStatus;
  response: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type ContractParty = "landlord" | "landlord_agent" | "tenant";
export type ContractKind = "residential" | "commercial";
export type PaymentFrequency = "monthly" | "quarterly" | "semiannual" | "annual";
export type ContractStatus = "new" | "contacted" | "awaiting_data" | "sent_to_ejar" | "documented" | "cancelled";

export type ContractRequest = {
  id: string;
  ref_no: number;
  submitter_id: string | null;
  requester_name: string | null;
  requester_phone: string | null;
  requester_email: string | null;
  requester_role: ContractParty;
  contract_kind: ContractKind;
  is_renewal: boolean;
  property_type: PropertyType;
  district: string;
  deed_number: string | null;
  unit_details: string | null;
  other_party_name: string | null;
  other_party_phone: string | null;
  annual_rent: number;
  payment_frequency: PaymentFrequency;
  deposit: number | null;
  start_date: string;
  duration_months: number;
  notes: string | null;
  listing_id: string | null;
  status: ContractStatus;
  assigned_to: string | null;
  ejar_contract_number: string | null;
  contract_end_date: string | null;
  renewal_reminded_at: string | null;
  created_at: string;
};

export type ContractEvent = {
  id: string;
  contract_id: string;
  actor_id: string | null;
  from_status: ContractStatus | null;
  to_status: ContractStatus | null;
  note: string | null;
  is_internal: boolean;
  created_at: string;
};

/** نتيجة موحدة لإجراءات النماذج */
export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};
