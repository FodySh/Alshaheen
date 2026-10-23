-- Supabase يمنح افتراضياً صلاحيات TRUNCATE وREFERENCES وTRIGGER على كل جدول جديد.
-- الواجهة البرمجية لا تتيحها، لكن سحبها أنظف وأأمن.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- والجداول التي تُنشأ مستقبلاً
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;
