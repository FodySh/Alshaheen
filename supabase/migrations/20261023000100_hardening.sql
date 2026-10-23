-- =============================================================
-- تشديد بعد فحص Supabase الأمني
-- =============================================================

-- دوال المشغّلات (triggers) لا تُستدعى من الواجهة البرمجية أبداً.
-- المشغّل يعمل بدون صلاحية EXECUTE، فسحبها آمن.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.inquiries_before_write() from public, anon, authenticated;
revoke execute on function public.listings_sync_request() from public, anon, authenticated;
revoke execute on function public.requests_after_insert() from public, anon, authenticated;
revoke execute on function public.slots_before_delete() from public, anon, authenticated;
revoke execute on function public.listings_before_write() from public, anon, authenticated;
revoke execute on function public.complaints_before_update() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- دوال التحقق المستخدمة في سياسات المستخدمين المسجلين فقط: لا حاجة لها مع الزائر غير المسجل.
-- (is_staff تبقى متاحة للزائر لأنها جزء من سياسة قراءة العروض العامة)
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.can_access_request(uuid) from public, anon;
revoke execute on function public.can_manage_request(uuid) from public, anon;
revoke execute on function public.can_edit_listing(uuid) from public, anon;

-- فهارس للمفاتيح الأجنبية الأكثر استخداماً
create index if not exists bookings_listing_idx on public.bookings (listing_id);
create index if not exists inquiries_listing_idx on public.inquiries (listing_id);
create index if not exists listings_request_idx on public.listings (request_id);
