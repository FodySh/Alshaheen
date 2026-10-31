-- =============================================================
-- المصادقة بخطوتين لموظفي المكتب، وعمر جلسة الموظف
-- =============================================================
-- كل صلاحيات الموظف والمدير تمر عبر is_staff() وis_admin(). نشترط فيهما الآن
-- أن تكون الجلسة موثقة برمز تطبيق المصادقة (aal2) خلال آخر 12 ساعة.
-- بذلك لا تكفي كلمة المرور وحدها — ولا جلسة قديمة مسروقة — للوصول إلى بيانات المكتب،
-- حتى لو استُدعيت الواجهة البرمجية مباشرة دون المرور بالموقع.

begin;

create or replace function public.session_is_mfa_fresh()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end
      ) as e
      where jsonb_typeof(e) = 'object'
        and e ->> 'method' = 'totp'
        and to_timestamp((e ->> 'timestamp')::double precision) > now() - interval '12 hours'
    )
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.session_is_mfa_fresh() and exists (
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
  select public.session_is_mfa_fresh() and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  )
$$;

-- حالة المصادقة بخطوتين لأعضاء الفريق: لصفحة الفريق، للمدير فقط
create or replace function public.staff_mfa_status()
returns table (user_id uuid, has_totp boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, exists (
    select 1 from auth.mfa_factors f
    where f.user_id = p.id and f.factor_type = 'totp' and f.status = 'verified'
  )
  from public.profiles p
  where public.is_admin() and p.role in ('agent', 'admin')
$$;

-- إنهاء كل جلسات مستخدم (عند إعادة ضبط مصادقته بعد فقدان الجهاز). للخادم فقط.
create or replace function public.revoke_user_sessions(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user
$$;

revoke execute on function public.session_is_mfa_fresh() from public, anon;
grant execute on function public.session_is_mfa_fresh() to authenticated;
revoke execute on function public.staff_mfa_status() from public, anon;
grant execute on function public.staff_mfa_status() to authenticated;
revoke execute on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

commit;
