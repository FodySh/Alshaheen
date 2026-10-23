-- =============================================================
-- الشاهين لإدارة الأملاك — قاعدة البيانات
-- Supabase / PostgreSQL. شغّل هذا الملف مرة واحدة في SQL Editor.
-- يعمل كمعاملة واحدة: إما أن يُطبَّق كاملاً أو لا يُطبَّق شيء.
-- =============================================================

begin;

-- -------------------------------------------------------------
-- الأنواع
-- -------------------------------------------------------------
create type public.user_role as enum ('visitor', 'agent', 'admin');

create type public.property_type as enum (
  'apartment', 'villa', 'floor', 'duplex', 'townhouse',
  'land',
  'shop', 'office', 'showroom', 'warehouse',
  'building', 'compound'
);

create type public.deal_purpose as enum ('sale', 'rent');
create type public.rent_period as enum ('yearly', 'monthly');
create type public.submitter_capacity as enum ('owner', 'authorized_agent');

create type public.request_status as enum (
  'new', 'under_review', 'awaiting_license', 'published', 'closed', 'rejected'
);

create type public.listing_status as enum ('draft', 'published', 'sold', 'rented', 'archived');
create type public.inquiry_status as enum ('new', 'replied', 'closed');
create type public.booking_status as enum ('confirmed', 'cancelled', 'completed', 'no_show');
create type public.complaint_status as enum ('new', 'in_progress', 'resolved');
create type public.request_file_kind as enum ('photo', 'deed', 'authorization', 'other');

-- -------------------------------------------------------------
-- دوال مساعدة عامة
-- -------------------------------------------------------------
create or replace function public.riyadh_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Riyadh')::date
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- الملفات الشخصية والصلاحيات
-- -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  email text,
  role public.user_role not null default 'visitor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('agent', 'admin') and is_active
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  )
$$;

-- إنشاء الملف الشخصي تلقائياً عند التسجيل. الدور دائماً "زائر".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- تغيير الدور أو التعطيل: للمدير فقط.
create or replace function public.set_user_role(
  p_user uuid,
  p_role public.user_role,
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  if p_user = auth.uid() and (p_role <> 'admin' or not p_active) then
    raise exception 'لا يمكنك إزالة صلاحية المدير عن نفسك';
  end if;
  update public.profiles set role = p_role, is_active = p_active where id = p_user;
  if not found then
    raise exception 'المستخدم غير موجود';
  end if;
end;
$$;

-- -------------------------------------------------------------
-- إعدادات المكتب (صف واحد)
-- -------------------------------------------------------------
create table public.office_settings (
  id smallint primary key default 1 check (id = 1),
  office_name text not null default 'الشاهين لإدارة الأملاك',
  fal_license_number text,
  cr_number text,
  phone text default '0544840940',
  whatsapp text default '0544840940',
  email text,
  address text default 'جدة، المملكة العربية السعودية',
  about text,
  updated_at timestamptz not null default now()
);

insert into public.office_settings (id) values (1);

create trigger office_settings_updated_at before update on public.office_settings
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- العروض المنشورة
-- -------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  ref_no bigint generated always as identity (start with 1001) unique,
  request_id uuid,
  title text not null check (length(trim(title)) between 5 and 120),
  description text not null default '',
  property_type public.property_type not null,
  purpose public.deal_purpose not null,
  city text not null default 'جدة',
  district text not null,
  area_sqm numeric(10, 2) not null check (area_sqm > 0),
  bedrooms smallint check (bedrooms between 0 and 50),
  bathrooms smallint check (bathrooms between 0 and 50),
  age_years smallint check (age_years between 0 and 100),
  street_width_m numeric(5, 1) check (street_width_m > 0),
  facade text,
  features text[] not null default '{}',
  price numeric(14, 2) not null check (price > 0),
  rent_period public.rent_period,
  map_url text,
  ad_license_number text,
  ad_license_expiry date,
  status public.listing_status not null default 'draft',
  agent_id uuid not null references public.profiles (id),
  cover_image_path text,
  published_at timestamptz,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_rent_period_required
    check (purpose = 'sale' or rent_period is not null),
  constraint listings_license_required_when_published
    check (status <> 'published' or (
      coalesce(trim(ad_license_number), '') <> '' and ad_license_expiry is not null
    ))
);

create index listings_public_idx on public.listings (status, ad_license_expiry);
create index listings_agent_idx on public.listings (agent_id);

create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- عرض حي = منشور وترخيصه ساري. يُستخدم في الصلاحيات.
create or replace function public.listing_is_live(p_status public.listing_status, p_expiry date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_status = 'published' and p_expiry is not null and p_expiry >= public.riyadh_today()
$$;

-- لا يُنشر عرض بترخيص منتهٍ، ويُسجَّل وقت النشر.
create or replace function public.listings_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.agent_id and p.role in ('agent', 'admin') and p.is_active
  ) then
    raise exception 'الوسيط المسؤول يجب أن يكون موظفاً نشطاً';
  end if;
  if new.purpose = 'sale' then
    new.rent_period = null;
  end if;
  if new.status = 'published' then
    if new.ad_license_expiry < public.riyadh_today() then
      raise exception 'ترخيص الإعلان منتهي الصلاحية. حدّث رقم الترخيص وتاريخه قبل النشر';
    end if;
    if tg_op = 'INSERT' or old.status is distinct from 'published' then
      new.published_at = now();
    end if;
  end if;
  return new;
end;
$$;

create trigger listings_before_write before insert or update on public.listings
  for each row execute function public.listings_before_write();

create or replace function public.can_edit_listing(p_listing uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.listings l
    where l.id = p_listing and l.agent_id = auth.uid() and public.is_staff()
  )
$$;

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index listing_images_listing_idx on public.listing_images (listing_id, sort_order);

-- -------------------------------------------------------------
-- طلبات التسويق (يرفعها الملاك والوكلاء)
-- -------------------------------------------------------------
create table public.marketing_requests (
  id uuid primary key default gen_random_uuid(),
  ref_no bigint generated always as identity (start with 1001) unique,
  submitter_id uuid not null references public.profiles (id) default auth.uid(),
  capacity public.submitter_capacity not null,
  property_type public.property_type not null,
  purpose public.deal_purpose not null,
  city text not null default 'جدة',
  district text not null check (length(trim(district)) > 0),
  address_note text,
  area_sqm numeric(10, 2) not null check (area_sqm > 0),
  bedrooms smallint check (bedrooms between 0 and 50),
  bathrooms smallint check (bathrooms between 0 and 50),
  age_years smallint check (age_years between 0 and 100),
  street_width_m numeric(5, 1) check (street_width_m > 0),
  facade text,
  asking_price numeric(14, 2) not null check (asking_price > 0),
  rent_period public.rent_period,
  deed_number text not null check (length(trim(deed_number)) between 4 and 40),
  description text not null default '',
  status public.request_status not null default 'new',
  assigned_to uuid references public.profiles (id),
  rejection_reason text,
  listing_id uuid references public.listings (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_rent_period_required
    check (purpose = 'sale' or rent_period is not null)
);

alter table public.listings
  add constraint listings_request_fk
  foreign key (request_id) references public.marketing_requests (id) on delete set null;

create index requests_submitter_idx on public.marketing_requests (submitter_id);
create index requests_assigned_idx on public.marketing_requests (assigned_to, status);

create trigger requests_updated_at before update on public.marketing_requests
  for each row execute function public.set_updated_at();

create table public.request_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.marketing_requests (id) on delete cascade,
  kind public.request_file_kind not null,
  storage_path text not null,
  file_name text,
  created_at timestamptz not null default now()
);

create index request_files_request_idx on public.request_files (request_id);

-- سجل حالات الطلب. الملاحظات الداخلية لا يراها مقدم الطلب.
create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.marketing_requests (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  from_status public.request_status,
  to_status public.request_status,
  note text,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index request_events_request_idx on public.request_events (request_id, created_at);

create or replace function public.can_access_request(p_request uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.marketing_requests r
    where r.id = p_request
      and (
        r.submitter_id = auth.uid()
        or public.is_admin()
        or (public.is_staff() and r.assigned_to = auth.uid())
      )
  )
$$;

create or replace function public.can_manage_request(p_request uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.marketing_requests r
    where r.id = p_request and r.assigned_to = auth.uid() and public.is_staff()
  )
$$;

create or replace function public.requests_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.request_events (request_id, actor_id, from_status, to_status, note)
  values (new.id, new.submitter_id, null, 'new', 'تم استلام الطلب');
  return new;
end;
$$;

create trigger requests_after_insert after insert on public.marketing_requests
  for each row execute function public.requests_after_insert();

-- تغيير حالة الطلب يدوياً. "منشور" تُضبط تلقائياً عند نشر العرض المرتبط.
create or replace function public.set_request_status(
  p_request uuid,
  p_status public.request_status,
  p_note text default null,
  p_internal boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.request_status;
begin
  if not public.can_manage_request(p_request) then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  if p_status = 'published' then
    raise exception 'تتحول الحالة إلى "منشور" تلقائياً عند نشر العرض المرتبط بالطلب';
  end if;
  if p_status = 'rejected' and coalesce(trim(p_note), '') = '' then
    raise exception 'اكتب سبب الرفض ليظهر لمقدم الطلب';
  end if;

  select status into v_old from public.marketing_requests where id = p_request for update;

  update public.marketing_requests
  set status = p_status,
      rejection_reason = case when p_status = 'rejected' then p_note else rejection_reason end
  where id = p_request;

  insert into public.request_events (request_id, actor_id, from_status, to_status, note, is_internal)
  values (
    p_request, auth.uid(), v_old, p_status, nullif(trim(p_note), ''),
    case when p_status = 'rejected' then false else p_internal end
  );
end;
$$;

create or replace function public.add_request_note(p_request uuid, p_note text, p_internal boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_request(p_request) then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'الملاحظة فارغة';
  end if;
  insert into public.request_events (request_id, actor_id, note, is_internal)
  values (p_request, auth.uid(), trim(p_note), p_internal);
end;
$$;

create or replace function public.assign_request(p_request uuid, p_agent uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_status public.request_status;
begin
  if not public.is_admin() then
    raise exception 'الإسناد للمدير فقط' using errcode = '42501';
  end if;
  select full_name into v_name from public.profiles
  where id = p_agent and role in ('agent', 'admin') and is_active;
  if not found then
    raise exception 'الموظف غير موجود أو غير نشط';
  end if;

  select status into v_status from public.marketing_requests where id = p_request for update;
  if not found then
    raise exception 'الطلب غير موجود';
  end if;

  update public.marketing_requests
  set assigned_to = p_agent,
      status = case when status = 'new' then 'under_review' else status end
  where id = p_request;

  insert into public.request_events (request_id, actor_id, from_status, to_status, note, is_internal)
  values (
    p_request, auth.uid(), v_status,
    case when v_status = 'new' then 'under_review'::public.request_status else v_status end,
    'أُسند إلى ' || coalesce(nullif(v_name, ''), 'موظف'), true
  );
  if v_status = 'new' then
    insert into public.request_events (request_id, actor_id, from_status, to_status, note)
    values (p_request, auth.uid(), 'new', 'under_review', 'بدأت مراجعة الطلب');
  end if;
end;
$$;

-- ربط العرض بالطلب: النشر يحوّل الطلب إلى "منشور"، والبيع أو التأجير يغلقه.
create or replace function public.listings_sync_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.request_status;
  v_target public.request_status;
  v_note text;
begin
  if new.request_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  if new.status = 'published' then
    v_target := 'published';
    v_note := 'نُشر العرض برقم ترخيص الإعلان ' || new.ad_license_number;
  elsif new.status = 'sold' then
    v_target := 'closed';
    v_note := 'تم البيع';
  elsif new.status = 'rented' then
    v_target := 'closed';
    v_note := 'تم التأجير';
  else
    return new;
  end if;

  select status into v_old from public.marketing_requests where id = new.request_id;
  if v_old is distinct from v_target then
    update public.marketing_requests
    set status = v_target, listing_id = new.id
    where id = new.request_id;
    insert into public.request_events (request_id, actor_id, from_status, to_status, note)
    values (new.request_id, auth.uid(), v_old, v_target, v_note);
  end if;
  return new;
end;
$$;

create trigger listings_sync_request after insert or update of status on public.listings
  for each row execute function public.listings_sync_request();

-- -------------------------------------------------------------
-- الاستفسارات
-- -------------------------------------------------------------
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  ref_no bigint generated always as identity (start with 1001) unique,
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) default auth.uid(),
  message text not null check (length(trim(message)) between 5 and 2000),
  status public.inquiry_status not null default 'new',
  reply text,
  replied_at timestamptz,
  replied_by uuid references public.profiles (id),
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inquiries_user_idx on public.inquiries (user_id);
create index inquiries_assigned_idx on public.inquiries (assigned_to, status);

create trigger inquiries_updated_at before update on public.inquiries
  for each row execute function public.set_updated_at();

create or replace function public.inquiries_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select agent_id into new.assigned_to from public.listings where id = new.listing_id;
    new.status := 'new';
    new.reply := null;
  elsif new.reply is distinct from old.reply and coalesce(trim(new.reply), '') <> '' then
    new.replied_at := now();
    new.replied_by := auth.uid();
    if new.status = 'new' then
      new.status := 'replied';
    end if;
  end if;
  return new;
end;
$$;

create trigger inquiries_before_write before insert or update on public.inquiries
  for each row execute function public.inquiries_before_write();

-- -------------------------------------------------------------
-- مواعيد المعاينة والحجوزات
-- -------------------------------------------------------------
create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles (id) default auth.uid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint slots_valid_range check (ends_at > starts_at and ends_at - starts_at <= interval '4 hours'),
  constraint slots_unique_start unique (agent_id, starts_at)
);

create index slots_agent_time_idx on public.availability_slots (agent_id, starts_at);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref_no bigint generated always as identity (start with 1001) unique,
  listing_id uuid not null references public.listings (id) on delete cascade,
  slot_id uuid references public.availability_slots (id) on delete set null,
  visitor_id uuid not null references public.profiles (id),
  agent_id uuid not null references public.profiles (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'confirmed',
  visitor_note text check (visitor_note is null or length(visitor_note) <= 500),
  office_note text,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- لا يُحجز الموعد الواحد مرتين.
create unique index bookings_one_active_per_slot
  on public.bookings (slot_id) where status = 'confirmed';
create index bookings_visitor_idx on public.bookings (visitor_id, starts_at);
create index bookings_agent_idx on public.bookings (agent_id, starts_at);

create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create or replace function public.slots_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.bookings where slot_id = old.id and status = 'confirmed') then
    raise exception 'هذا الموعد محجوز. ألغِ الحجز أولاً ثم احذف الموعد';
  end if;
  return old;
end;
$$;

create trigger slots_before_delete before delete on public.availability_slots
  for each row execute function public.slots_before_delete();

-- المواعيد المتاحة لعرض معيّن (مواعيد الوسيط المسؤول، بعد ساعتين على الأقل، وخلال 30 يوماً).
create or replace function public.available_slots(p_listing uuid)
returns table (slot_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.starts_at, s.ends_at
  from public.listings l
  join public.availability_slots s on s.agent_id = l.agent_id
  where l.id = p_listing
    and public.listing_is_live(l.status, l.ad_license_expiry)
    and s.starts_at > now() + interval '2 hours'
    and s.starts_at < now() + interval '30 days'
    and not exists (
      select 1 from public.bookings b where b.slot_id = s.id and b.status = 'confirmed'
    )
  order by s.starts_at
  limit 200
$$;

create or replace function public.book_viewing(p_listing uuid, p_slot uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.listings;
  v_slot public.availability_slots;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'سجّل الدخول لحجز موعد' using errcode = '42501';
  end if;

  select * into v_listing from public.listings where id = p_listing;
  if not found or not public.listing_is_live(v_listing.status, v_listing.ad_license_expiry) then
    raise exception 'العرض غير متاح للحجز';
  end if;

  select * into v_slot from public.availability_slots where id = p_slot for update;
  if not found or v_slot.agent_id <> v_listing.agent_id then
    raise exception 'الموعد غير متاح';
  end if;
  if v_slot.starts_at <= now() + interval '2 hours' then
    raise exception 'هذا الموعد قريب جداً. اختر موعداً آخر';
  end if;

  if exists (
    select 1 from public.bookings
    where listing_id = p_listing and visitor_id = auth.uid()
      and status = 'confirmed' and starts_at > now()
  ) then
    raise exception 'لديك موعد معاينة قائم لهذا العقار. ألغِه أولاً إن أردت تغييره';
  end if;

  begin
    insert into public.bookings (listing_id, slot_id, visitor_id, agent_id, starts_at, ends_at, visitor_note)
    values (p_listing, p_slot, auth.uid(), v_slot.agent_id, v_slot.starts_at, v_slot.ends_at,
            nullif(trim(p_note), ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'حُجز هذا الموعد للتو. اختر موعداً آخر';
  end;

  return v_id;
end;
$$;

create or replace function public.cancel_booking(p_booking uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.bookings;
begin
  select * into v from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'الحجز غير موجود';
  end if;
  if not (v.visitor_id = auth.uid() or public.is_admin() or (public.is_staff() and v.agent_id = auth.uid())) then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  if v.status <> 'confirmed' then
    raise exception 'لا يمكن إلغاء هذا الحجز';
  end if;
  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
      office_note = case when v.visitor_id = auth.uid() then office_note else coalesce(nullif(trim(p_reason), ''), office_note) end
  where id = p_booking;
end;
$$;

create or replace function public.set_booking_outcome(p_booking uuid, p_status public.booking_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.bookings;
begin
  if p_status not in ('completed', 'no_show') then
    raise exception 'حالة غير صالحة';
  end if;
  select * into v from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'الحجز غير موجود';
  end if;
  if not (public.is_admin() or (public.is_staff() and v.agent_id = auth.uid())) then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  if v.status <> 'confirmed' then
    raise exception 'الحجز ليس قائماً';
  end if;
  update public.bookings
  set status = p_status, office_note = coalesce(nullif(trim(p_note), ''), office_note)
  where id = p_booking;
end;
$$;

-- -------------------------------------------------------------
-- الشكاوى
-- -------------------------------------------------------------
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  ref_no bigint generated always as identity (start with 1001) unique,
  user_id uuid references public.profiles (id),
  name text not null check (length(trim(name)) between 2 and 100),
  phone text not null check (length(trim(phone)) between 9 and 20),
  email text,
  listing_ref text,
  subject text not null check (length(trim(subject)) between 3 and 150),
  body text not null check (length(trim(body)) between 10 and 3000),
  status public.complaint_status not null default 'new',
  response text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger complaints_updated_at before update on public.complaints
  for each row execute function public.set_updated_at();

create or replace function public.complaints_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := now();
  elsif new.status <> 'resolved' then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

create trigger complaints_before_update before update on public.complaints
  for each row execute function public.complaints_before_update();

-- تقديم شكوى (متاح للزوار بدون تسجيل). يعيد رقم الشكوى.
create or replace function public.submit_complaint(
  p_name text, p_phone text, p_email text, p_listing_ref text, p_subject text, p_body text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref bigint;
begin
  -- حد بسيط ضد الإغراق: 5 شكاوى في الساعة لنفس رقم الجوال
  if (select count(*) from public.complaints
      where phone = trim(p_phone) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'استلمنا عدة شكاوى من هذا الرقم خلال الساعة الماضية. حاول لاحقاً';
  end if;
  insert into public.complaints (user_id, name, phone, email, listing_ref, subject, body)
  values (auth.uid(), trim(p_name), trim(p_phone), nullif(trim(p_email), ''),
          nullif(trim(p_listing_ref), ''), trim(p_subject), trim(p_body))
  returning ref_no into v_ref;
  return v_ref;
end;
$$;

-- =============================================================
-- الصلاحيات الأساسية (صريحة حتى لا نعتمد على الإعدادات الافتراضية للمشروع)
-- =============================================================
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant insert, update, delete on public.listings, public.listing_images, public.availability_slots to authenticated;
grant execute on function
  public.riyadh_today(),
  public.listing_is_live(public.listing_status, date),
  public.is_staff(),
  public.is_admin(),
  public.can_access_request(uuid),
  public.can_manage_request(uuid),
  public.can_edit_listing(uuid),
  public.available_slots(uuid),
  public.submit_complaint(text, text, text, text, text, text)
  to anon, authenticated;

-- =============================================================
-- صلاحيات الأعمدة: الكتابة المباشرة محصورة، والباقي عبر الدوال أعلاه
-- =============================================================
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

revoke insert, update, delete on public.office_settings from anon, authenticated;
grant update (office_name, fal_license_number, cr_number, phone, whatsapp, email, address, about)
  on public.office_settings to authenticated;

revoke insert, update, delete on public.marketing_requests from anon, authenticated;
grant insert (capacity, property_type, purpose, district, address_note, area_sqm, bedrooms, bathrooms,
              age_years, street_width_m, facade, asking_price, rent_period, deed_number, description)
  on public.marketing_requests to authenticated;

revoke insert, update, delete on public.request_files from anon, authenticated;
grant insert (request_id, kind, storage_path, file_name) on public.request_files to authenticated;

revoke insert, update, delete on public.request_events from anon, authenticated;

revoke insert, update, delete on public.listings from anon;
revoke insert, update, delete on public.listing_images from anon;

revoke insert, update, delete on public.inquiries from anon, authenticated;
grant insert (listing_id, message) on public.inquiries to authenticated;
grant update (status, reply) on public.inquiries to authenticated;

revoke insert, update, delete on public.availability_slots from anon;
revoke insert, update, delete on public.bookings from anon, authenticated;

revoke insert, update, delete on public.complaints from anon, authenticated;
grant update (status, response) on public.complaints to authenticated;

-- الدوال الحساسة: للمستخدمين المسجلين فقط (وتتحقق داخلياً من الصلاحية)
revoke execute on function public.set_user_role(uuid, public.user_role, boolean) from public, anon;
grant execute on function public.set_user_role(uuid, public.user_role, boolean) to authenticated;
revoke execute on function public.set_request_status(uuid, public.request_status, text, boolean) from public, anon;
grant execute on function public.set_request_status(uuid, public.request_status, text, boolean) to authenticated;
revoke execute on function public.add_request_note(uuid, text, boolean) from public, anon;
grant execute on function public.add_request_note(uuid, text, boolean) to authenticated;
revoke execute on function public.assign_request(uuid, uuid) from public, anon;
grant execute on function public.assign_request(uuid, uuid) to authenticated;
revoke execute on function public.book_viewing(uuid, uuid, text) from public, anon;
grant execute on function public.book_viewing(uuid, uuid, text) to authenticated;
revoke execute on function public.cancel_booking(uuid, text) from public, anon;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
revoke execute on function public.set_booking_outcome(uuid, public.booking_status, text) from public, anon;
grant execute on function public.set_booking_outcome(uuid, public.booking_status, text) to authenticated;

-- =============================================================
-- سياسات الوصول (RLS)
-- =============================================================
alter table public.profiles enable row level security;
alter table public.office_settings enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.marketing_requests enable row level security;
alter table public.request_files enable row level security;
alter table public.request_events enable row level security;
alter table public.inquiries enable row level security;
alter table public.availability_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.complaints enable row level security;

-- الملفات الشخصية
create policy "profiles: read own or staff" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- إعدادات المكتب
create policy "settings: public read" on public.office_settings
  for select to anon, authenticated using (true);
create policy "settings: admin update" on public.office_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- العروض
create policy "listings: public reads live, staff reads all" on public.listings
  for select to anon, authenticated
  using (public.listing_is_live(status, ad_license_expiry) or public.is_staff());
create policy "listings: staff insert" on public.listings
  for insert to authenticated
  with check (public.is_admin() or (public.is_staff() and agent_id = auth.uid()));
create policy "listings: owner agent or admin update" on public.listings
  for update to authenticated
  using (public.is_admin() or (public.is_staff() and agent_id = auth.uid()))
  with check (public.is_admin() or (public.is_staff() and agent_id = auth.uid()));
create policy "listings: admin delete" on public.listings
  for delete to authenticated using (public.is_admin());


create policy "listing images: visible with listing" on public.listing_images
  for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy "listing images: editors insert" on public.listing_images
  for insert to authenticated with check (public.can_edit_listing(listing_id));
create policy "listing images: editors update" on public.listing_images
  for update to authenticated
  using (public.can_edit_listing(listing_id)) with check (public.can_edit_listing(listing_id));
create policy "listing images: editors delete" on public.listing_images
  for delete to authenticated using (public.can_edit_listing(listing_id));

-- طلبات التسويق
create policy "requests: submitter insert" on public.marketing_requests
  for insert to authenticated
  with check (submitter_id = auth.uid());
create policy "requests: read own, assigned or admin" on public.marketing_requests
  for select to authenticated
  using (
    submitter_id = auth.uid()
    or public.is_admin()
    or (assigned_to = auth.uid() and public.is_staff())
  );

create policy "request files: read with request" on public.request_files
  for select to authenticated using (public.can_access_request(request_id));
create policy "request files: submitter adds while open" on public.request_files
  for insert to authenticated
  with check (
    storage_path like auth.uid()::text || '/' || request_id::text || '/%'
    and exists (
      select 1 from public.marketing_requests r
      where r.id = request_id and r.submitter_id = auth.uid()
        and r.status in ('new', 'under_review', 'awaiting_license')
    )
  );

create policy "request events: submitter sees public, staff sees all" on public.request_events
  for select to authenticated
  using (
    public.can_manage_request(request_id)
    or (not is_internal and exists (
      select 1 from public.marketing_requests r
      where r.id = request_id and r.submitter_id = auth.uid()
    ))
  );

-- الاستفسارات
create policy "inquiries: insert on live listing" on public.inquiries
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and public.listing_is_live(l.status, l.ad_license_expiry)
    )
  );
create policy "inquiries: read own, assigned or admin" on public.inquiries
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or (assigned_to = auth.uid() and public.is_staff()));
create policy "inquiries: assigned or admin update" on public.inquiries
  for update to authenticated
  using (public.is_admin() or (assigned_to = auth.uid() and public.is_staff()))
  with check (public.is_admin() or (assigned_to = auth.uid() and public.is_staff()));

-- المواعيد
create policy "slots: staff read own, admin all" on public.availability_slots
  for select to authenticated
  using (public.is_admin() or (agent_id = auth.uid() and public.is_staff()));
create policy "slots: staff insert own, admin any" on public.availability_slots
  for insert to authenticated
  with check (public.is_admin() or (agent_id = auth.uid() and public.is_staff()));
create policy "slots: staff delete own, admin any" on public.availability_slots
  for delete to authenticated
  using (public.is_admin() or (agent_id = auth.uid() and public.is_staff()));

create policy "bookings: read own, agent or admin" on public.bookings
  for select to authenticated
  using (visitor_id = auth.uid() or public.is_admin() or (agent_id = auth.uid() and public.is_staff()));

-- الشكاوى
create policy "complaints: read own or admin" on public.complaints
  for select to authenticated
  using ((user_id is not null and user_id = auth.uid()) or public.is_admin());
create policy "complaints: admin update" on public.complaints
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- التخزين: صور العروض (عامة) وملفات الطلبات (خاصة)
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 10485760,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('request-files', 'request-files', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "listing images bucket: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'listing-images');
create policy "listing images bucket: staff write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-images' and public.is_staff());
create policy "listing images bucket: staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-images' and public.is_staff())
  with check (bucket_id = 'listing-images' and public.is_staff());
create policy "listing images bucket: staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-images' and public.is_staff());

-- المسار: {user_id}/{request_id}/{file}
create policy "request files bucket: owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'request-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "request files bucket: owner, assigned agent or admin read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'request-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1 from public.marketing_requests r
        where r.id::text = (storage.foldername(name))[2]
          and r.assigned_to = auth.uid()
          and public.is_staff()
      )
    )
  );

commit;
