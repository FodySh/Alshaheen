-- =============================================================
-- طلب توثيق العقد متاح بدون تسجيل دخول
-- مقدم الطلب يكتب اسمه وجواله (وبريده اختيارياً)، والإدخال يتم عبر دالة واحدة بحدود ضد الإغراق
-- =============================================================

alter table public.contract_requests alter column submitter_id drop not null;
alter table public.contract_requests alter column submitter_id drop default;

alter table public.contract_requests
  add column requester_name text
    check (requester_name is null or length(trim(requester_name)) between 2 and 100),
  add column requester_phone text
    check (requester_phone is null or requester_phone ~ '^05[0-9]{8}$'),
  add column requester_email text
    check (requester_email is null or (length(requester_email) <= 200 and requester_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

update public.contract_requests c
set requester_name = coalesce(c.requester_name, nullif(trim(p.full_name), '')),
    requester_phone = coalesce(c.requester_phone, case when p.phone ~ '^05[0-9]{8}$' then p.phone end),
    requester_email = coalesce(c.requester_email, p.email)
from public.profiles p
where p.id = c.submitter_id;

alter table public.contract_requests
  add constraint contracts_requester_contact
  check (submitter_id is not null or (requester_name is not null and requester_phone is not null));

create index contracts_requester_phone_idx on public.contract_requests (requester_phone, created_at);

-- الإدخال المباشر في الجدول لم يعد مسموحاً؛ كل الطلبات تمر عبر الدالة
drop policy if exists "contracts: submitter insert" on public.contract_requests;
revoke insert on public.contract_requests from anon, authenticated;

create or replace function public.submit_contract_request(
  p_requester_name text,
  p_requester_phone text,
  p_requester_email text,
  p_requester_role public.contract_party,
  p_contract_kind public.contract_kind,
  p_is_renewal boolean,
  p_property_type public.property_type,
  p_district text,
  p_deed_number text,
  p_unit_details text,
  p_other_party_name text,
  p_other_party_phone text,
  p_annual_rent numeric,
  p_payment_frequency public.payment_frequency,
  p_deposit numeric,
  p_start_date date,
  p_duration_months integer,
  p_notes text
)
returns table (request_id uuid, request_ref bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(trim(p_requester_name), '');
  v_phone text := nullif(trim(p_requester_phone), '');
  v_email text := nullif(lower(trim(p_requester_email)), '');
  v_id uuid;
  v_ref bigint;
begin
  -- المستخدم المسجّل: نكمل الناقص من ملفه
  if v_uid is not null then
    select coalesce(v_name, nullif(trim(p.full_name), '')),
           coalesce(v_phone, case when p.phone ~ '^05[0-9]{8}$' then p.phone end),
           coalesce(v_email, p.email)
      into v_name, v_phone, v_email
    from public.profiles p where p.id = v_uid;
  end if;

  if v_name is null or length(v_name) < 2 then
    raise exception 'اكتب اسمك';
  end if;
  if v_phone is null or v_phone !~ '^05[0-9]{8}$' then
    raise exception 'اكتب رقم جوالك بصيغة 05xxxxxxxx';
  end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'البريد الإلكتروني غير صحيح';
  end if;
  if p_start_date < public.riyadh_today() - 60 then
    raise exception 'تاريخ البداية قديم جداً. لتوثيق عقد سابق تواصل مع المكتب مباشرة';
  end if;

  -- حدود ضد الإغراق: المسجّل بحسابه، والزائر برقم جواله
  if v_uid is not null then
    if (select count(*) from public.contract_requests
        where submitter_id = v_uid and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'أرسلت عدة طلبات خلال الساعة الماضية. سنتواصل معك قريباً';
    end if;
  elsif (select count(*) from public.contract_requests
      where requester_phone = v_phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'استلمنا عدة طلبات من هذا الرقم خلال الساعة الماضية. سنتواصل معك قريباً';
  end if;
  if v_uid is null and (select count(*) from public.contract_requests
      where submitter_id is null and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'نستقبل عدداً كبيراً من الطلبات الآن. حاول بعد قليل أو تواصل معنا هاتفياً';
  end if;

  insert into public.contract_requests (
    submitter_id, requester_name, requester_phone, requester_email,
    requester_role, contract_kind, is_renewal, property_type, district, deed_number, unit_details,
    other_party_name, other_party_phone, annual_rent, payment_frequency, deposit,
    start_date, duration_months, notes
  ) values (
    v_uid, v_name, v_phone, v_email,
    p_requester_role, p_contract_kind, coalesce(p_is_renewal, false), p_property_type, trim(p_district),
    nullif(trim(p_deed_number), ''), nullif(trim(p_unit_details), ''),
    nullif(trim(p_other_party_name), ''), nullif(trim(p_other_party_phone), ''),
    p_annual_rent, p_payment_frequency, p_deposit, p_start_date, p_duration_months, nullif(trim(p_notes), '')
  )
  returning id, ref_no into v_id, v_ref;

  return query select v_id, v_ref;
end;
$$;

revoke execute on function public.submit_contract_request(
  text, text, text, public.contract_party, public.contract_kind, boolean, public.property_type, text, text, text,
  text, text, numeric, public.payment_frequency, numeric, date, integer, text
) from public;
grant execute on function public.submit_contract_request(
  text, text, text, public.contract_party, public.contract_kind, boolean, public.property_type, text, text, text,
  text, text, numeric, public.payment_frequency, numeric, date, integer, text
) to anon, authenticated;

-- الطلب المنشأ من عرض مؤجَّر: بيانات التواصل من ملف المالك إن وُجد طلب تسويق
create or replace function public.create_contract_from_listing(p_listing uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.listings;
  r public.marketing_requests;
  o public.profiles;
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
    select * into o from public.profiles where id = r.submitter_id;
  end if;
  v_owner := coalesce(r.submitter_id, auth.uid());
  v_role := case when r.capacity = 'authorized_agent' then 'landlord_agent'::public.contract_party else 'landlord'::public.contract_party end;

  insert into public.contract_requests (
    submitter_id, requester_name, requester_phone, requester_email,
    requester_role, contract_kind, property_type, district, deed_number,
    annual_rent, payment_frequency, start_date, duration_months, listing_id, assigned_to, notes
  ) values (
    v_owner, nullif(trim(o.full_name), ''), case when o.phone ~ '^05[0-9]{8}$' then o.phone end, o.email,
    v_role,
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
