-- =============================================================
-- قائمة الأحياء: يديرها المدير من لوحة المكتب
-- =============================================================

create table public.districts (
  name text primary key check (length(trim(name)) between 2 and 60),
  created_at timestamptz not null default now()
);

alter table public.districts enable row level security;

grant select on public.districts to anon, authenticated;
grant insert, delete on public.districts to authenticated;
revoke update on public.districts from anon, authenticated;

create policy "districts: public read" on public.districts
  for select to anon, authenticated using (true);
create policy "districts: admin insert" on public.districts
  for insert to authenticated with check (public.is_admin());
create policy "districts: admin delete" on public.districts
  for delete to authenticated using (public.is_admin());

insert into public.districts (name) values
  ('أبحر الشمالية'), ('أبحر الجنوبية'), ('الأجواد'), ('الأمير فواز'), ('الأندلس'),
  ('البساتين'), ('البغدادية'), ('البلد'), ('البوادي'), ('الثغر'), ('الجامعة'),
  ('الحمدانية'), ('الحمراء'), ('الخالدية'), ('الربوة'), ('الرحاب'), ('الروضة'),
  ('الرويس'), ('الريان'), ('الزهراء'), ('السامر'), ('السلامة'), ('السليمانية'),
  ('الشاطئ'), ('الشراع'), ('الشرفية'), ('الصفا'), ('الصواري'), ('الفيحاء'),
  ('الفيصلية'), ('الكندرة'), ('اللؤلؤ'), ('المحمدية'), ('المرجان'), ('المروة'),
  ('النخيل'), ('النزهة'), ('النسيم'), ('النعيم'), ('النهضة'), ('الواحة'),
  ('الورود'), ('الياقوت'), ('أم الخير'), ('بني مالك'), ('طيبة'), ('مشرفة')
on conflict (name) do nothing;
