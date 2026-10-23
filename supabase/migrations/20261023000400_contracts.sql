-- =============================================================
-- طلبات توثيق عقود الإيجار (ينفّذها المكتب في منصة إيجار)
-- =============================================================

create type public.contract_party as enum ('landlord', 'landlord_agent', 'tenant');
create type public.contract_kind as enum ('residential', 'commercial');
create type public.payment_frequency as enum ('monthly', 'quarterly', 'semiannual', 'annual');
create type public.contract_status as enum (
  'new', 'contacted', 'awaiting_data', 'sent_to_ejar', 'documented', 'cancelled'
);

alter table public.office_settings add column contract_service_fee text;
grant update (contract_service_fee) on public.office_settings to authenticated;

create table public.contract_requests (
  id uuid primary key default gen_random_uuid(),
  ref_no bigint generated always as identity (start with 1001) unique,
  submitter_id uuid not null references public.profiles (id) default auth.uid(),
  requester_role public.contract_party not null,
  contract_kind public.contract_kind not null,
  is_renewal boolean not null default false,
  property_type public.property_type not null,
  district text not null check (length(trim(district)) between 2 and 60),
  deed_number text check (deed_number is null or length(trim(deed_number)) between 4 and 40),
  unit_details text check (unit_details is null or length(unit_details) <= 100),
  other_party_name text check (other_party_name is null or length(trim(other_party_name)) between 2 and 100),
  other_party_phone text check (other_party_phone is null or other_party_phone ~ '^05[0-9]{8}$'),
  annual_rent numeric(14, 2) not null check (annual_rent > 0),
  payment_frequency public.payment_frequency not null,
  deposit numeric(14, 2) check (deposit is null or deposit >= 0),
  start_date date not null,
  duration_months smallint not null check (duration_months between 1 and 120),
  notes text check (notes is null or length(notes) <= 2000),
  listing_id uuid references public.listings (id) on delete set null,
  status public.contract_status not null default 'new',
  assigned_to uuid references public.profiles (id),
  ejar_contract_number text,
  contract_end_date date,
  renewal_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_documented_fields
    check (status <> 'documented' or (
      coalesce(trim(ejar_contract_number), '') <> '' and contract_end_date is not null
    ))
);

create index contracts_submitter_idx on public.contract_requests (submitter_id);
create index contracts_assigned_idx on public.contract_requests (assigned_to, status);
create index contracts_end_idx on public.contract_requests (status, contract_end_date);
create index contracts_listing_idx on public.contract_requests (listing_id);

create trigger contracts_updated_at before update on public.contract_requests
  for each row execute function public.set_updated_at();

create table public.contract_events (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contract_requests (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  from_status public.contract_status,
  to_status public.contract_status,
  note text,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index contract_events_contract_idx on public.contract_events (contract_id, created_at);

-- -------------------------------------------------------------
-- الدوال
-- -------------------------------------------------------------
create or replace function public.can_manage_contract(p_contract uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.contract_requests c
    where c.id = p_contract and c.assigned_to = auth.uid() and public.is_staff()
  )
$$;

create or replace function public.contracts_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.contract_events (contract_id, actor_id, from_status, to_status, note)
  values (new.id, new.submitter_id, null, new.status, 'تم استلام الطلب');
  return new;
end;
$$;

create trigger contracts_after_insert after insert on public.contract_requests
  for each row execute function public.contracts_after_insert();

create or replace function public.assign_contract(p_contract uuid, p_agent uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_status public.contract_status;
begin
  if not public.is_admin() then
    raise exception 'الإسناد للمدير فقط' using errcode = '42501';
  end if;
  select full_name into v_name from public.profiles
  where id = p_agent and role in ('agent', 'admin') and is_active;
  if not found then
    raise exception 'الموظف غير موجود أو غير نشط';
  end if;
  select status into v_status from public.contract_requests where id = p_contract for update;
  if not found then
    raise exception 'الطلب غير موجود';
  end if;
  update public.contract_requests set assigned_to = p_agent where id = p_contract;
  insert into public.contract_events (contract_id, actor_id, from_status, to_status, note, is_internal)
  values (p_contract, auth.uid(), v_status, v_status, 'أُسند إلى ' || coalesce(nullif(v_name, ''), 'موظف'), true);
end;
$$;

-- تغيير الحالة. "موثّق" يتطلب رقم عقد إيجار وتاريخ الانتهاء، و"ملغى" يتطلب سبباً يظهر للعميل.
create or replace function public.set_contract_status(
  p_contract uuid,
  p_status public.contract_status,
  p_note text default null,
  p_internal boolean default false,
  p_ejar_number text default null,
  p_end_date date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.contract_status;
begin
  if not public.can_manage_contract(p_contract) then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  if p_status = 'new' then
    raise exception 'لا يمكن إعادة الطلب إلى حالة جديد';
  end if;
  if p_status = 'documented' and (coalesce(trim(p_ejar_number), '') = '' or p_end_date is null) then
    raise exception 'اكتب رقم عقد إيجار وتاريخ انتهاء العقد';
  end if;
  if p_status = 'cancelled' and coalesce(trim(p_note), '') = '' then
    raise exception 'اكتب سبب الإلغاء ليظهر لمقدم الطلب';
  end if;

  select status into v_old from public.contract_requests where id = p_contract for update;

  update public.contract_requests
  set status = p_status,
      ejar_contract_number = case when p_status = 'documented' then trim(p_ejar_number) else ejar_contract_number end,
      contract_end_date = case when p_status = 'documented' then p_end_date else contract_end_date end,
      renewal_reminded_at = case when p_status = 'documented' then null else renewal_reminded_at end
  where id = p_contract;

  insert into public.contract_events (contract_id, actor_id, from_status, to_status, note, is_internal)
  values (
    p_contract, auth.uid(), v_old, p_status, nullif(trim(p_note), ''),
    case when p_status in ('cancelled', 'documented') then false else p_internal end
  );
end;
$$;

create or replace function public.add_contract_note(p_contract uuid, p_note text, p_internal boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_contract(p_contract) then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'الملاحظة فارغة';
  end if;
  insert into public.contract_events (contract_id, actor_id, note, is_internal)
  values (p_contract, auth.uid(), trim(p_note), p_internal);
end;
$$;

-- إنشاء طلب توثيق من عرض مؤجَّر. المالك (مقدم طلب التسويق إن وُجد) يصبح صاحب الطلب ويراه في حسابه.
create or replace function public.create_contract_from_listing(p_listing uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.listings;
  r public.marketing_requests;
  v_owner uuid;
  v_role public.contract_party;
  v_id uuid;
begin
  if not public.can_edit_listing(p_listing) then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  select * into l from public.listings where id = p_listing;
  if not found then
    raise exception 'العرض غير موجود';
  end if;
  if l.purpose <> 'rent' then
    raise exception 'العرض ليس للإيجار';
  end if;
  select id into v_id from public.contract_requests
  where listing_id = p_listing and status <> 'cancelled' limit 1;
  if v_id is not null then
    return v_id;
  end if;

  if l.request_id is not null then
    select * into r from public.marketing_requests where id = l.request_id;
  end if;
  v_owner := coalesce(r.submitter_id, auth.uid());
  v_role := case when r.capacity = 'authorized_agent' then 'landlord_agent'::public.contract_party else 'landlord'::public.contract_party end;

  insert into public.contract_requests (
    submitter_id, requester_role, contract_kind, property_type, district, deed_number,
    annual_rent, payment_frequency, start_date, duration_months, listing_id, assigned_to, notes
  ) values (
    v_owner, v_role,
    case when l.property_type in ('shop', 'office', 'showroom', 'warehouse') then 'commercial'::public.contract_kind
         else 'residential'::public.contract_kind end,
    l.property_type, l.district, r.deed_number,
    case when l.rent_period = 'monthly' then l.price * 12 else l.price end,
    'annual', public.riyadh_today(), 12, l.id, l.agent_id,
    'أُنشئ من العرض رقم ' || l.ref_no || '. راجع البيانات مع الطرفين قبل الإرسال إلى إيجار.'
  ) returning id into v_id;

  insert into public.contract_events (contract_id, actor_id, note, is_internal)
  values (v_id, auth.uid(), 'أُنشئ الطلب من العرض المؤجَّر رقم ' || l.ref_no, true);
  return v_id;
end;
$$;

-- عقود موثّقة تنتهي خلال المدة المحددة ولم يُرسل لها تنبيه تجديد (للمهمة المجدولة)
create or replace function public.contracts_due_for_renewal(p_days integer default 60)
returns setof public.contract_requests
language sql
stable
set search_path = ''
as $$
  select * from public.contract_requests
  where status = 'documented'
    and renewal_reminded_at is null
    and contract_end_date is not null
    and contract_end_date between public.riyadh_today() and public.riyadh_today() + p_days
$$;

-- -------------------------------------------------------------
-- الصلاحيات
-- -------------------------------------------------------------
revoke all on public.contract_requests from anon, authenticated;
grant select on public.contract_requests to authenticated;
grant insert (requester_role, contract_kind, is_renewal, property_type, district, deed_number, unit_details,
              other_party_name, other_party_phone, annual_rent, payment_frequency, deposit, start_date,
              duration_months, notes)
  on public.contract_requests to authenticated;

revoke all on public.contract_events from anon, authenticated;
grant select on public.contract_events to authenticated;

-- المهمة المجدولة لتنبيه التجديد تعمل بمفتاح الخادم (service_role)
grant select, update on public.contract_requests to service_role;
grant select, insert on public.contract_events to service_role;
grant execute on function public.contracts_due_for_renewal(integer) to service_role;

revoke execute on function public.contracts_after_insert() from public, anon, authenticated;
revoke execute on function public.contracts_due_for_renewal(integer) from public, anon, authenticated;
revoke execute on function public.can_manage_contract(uuid) from public, anon;
grant execute on function public.can_manage_contract(uuid) to authenticated;
revoke execute on function public.assign_contract(uuid, uuid) from public, anon;
grant execute on function public.assign_contract(uuid, uuid) to authenticated;
revoke execute on function public.set_contract_status(uuid, public.contract_status, text, boolean, text, date) from public, anon;
grant execute on function public.set_contract_status(uuid, public.contract_status, text, boolean, text, date) to authenticated;
revoke execute on function public.add_contract_note(uuid, text, boolean) from public, anon;
grant execute on function public.add_contract_note(uuid, text, boolean) to authenticated;
revoke execute on function public.create_contract_from_listing(uuid) from public, anon;
grant execute on function public.create_contract_from_listing(uuid) to authenticated;

alter table public.contract_requests enable row level security;
alter table public.contract_events enable row level security;

create policy "contracts: submitter insert" on public.contract_requests
  for insert to authenticated
  with check (submitter_id = (select auth.uid()));
create policy "contracts: read own, assigned or admin" on public.contract_requests
  for select to authenticated
  using (
    submitter_id = (select auth.uid())
    or public.is_admin()
    or (assigned_to = (select auth.uid()) and public.is_staff())
  );

create policy "contract events: submitter sees public, staff sees all" on public.contract_events
  for select to authenticated
  using (
    public.can_manage_contract(contract_id)
    or (not is_internal and exists (
      select 1 from public.contract_requests c
      where c.id = contract_id and c.submitter_id = (select auth.uid())
    ))
  );
