
-- اختبار سياسات المصادقة بخطوتين داخل معاملة تُلغى دائماً (raise في النهاية).
-- يحاكي رموز JWT مختلفة لحساب المدير الحقيقي ويتحقق من أن صلاحيات الموظف تتبع مستوى الجلسة.
do $test$
declare
  v_admin uuid;
  v_now bigint := extract(epoch from now())::bigint;
  r text := '';
  n bigint;
  b boolean;
  ok boolean;
begin


  select id into v_admin from public.profiles where role = 'admin' and is_active limit 1;
  if v_admin is null then raise exception 'RESULT: no admin to test with'; end if;

  -- 1) كلمة مرور فقط (aal1)
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal1',
    'amr', json_build_array(json_build_object('method', 'password', 'timestamp', v_now)))::text, true);
  execute 'set local role authenticated';
  r := r || format('aal1: is_staff=%s is_admin=%s; ', public.is_staff(), public.is_admin());
  select count(*) into n from public.staff_mfa_status();
  r := r || format('aal1 staff_mfa_status rows=%s; ', n);
  begin
    perform public.set_user_role(v_admin, 'admin', true);
    r := r || 'aal1 set_user_role=ALLOWED(BAD); ';
  exception when others then
    r := r || format('aal1 set_user_role=denied(%s); ', sqlstate);
  end;
  begin
    update public.office_settings set about = about where id = 1;
    get diagnostics n = row_count;
    r := r || format('aal1 office_settings update rows=%s; ', n);
  end;
  select count(*) into n from public.profiles;
  r := r || format('aal1 profiles visible=%s; ', n);
  execute 'reset role';

  -- 2) aal2 بتحقق totp حديث
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', v_now),
                            json_build_object('method', 'password', 'timestamp', v_now - 60)))::text, true);
  execute 'set local role authenticated';
  r := r || format('aal2 fresh: is_staff=%s is_admin=%s; ', public.is_staff(), public.is_admin());
  select count(*) into n from public.staff_mfa_status();
  r := r || format('aal2 staff_mfa_status rows=%s; ', n);
  begin
    update public.office_settings set about = about where id = 1;
    get diagnostics n = row_count;
    r := r || format('aal2 office_settings update rows=%s; ', n);
  end;
  select count(*) into n from public.profiles;
  r := r || format('aal2 profiles visible=%s; ', n);
  begin
    perform public.revoke_user_sessions(v_admin);
    r := r || 'authenticated revoke_user_sessions=ALLOWED(BAD); ';
  exception when others then
    r := r || format('authenticated revoke_user_sessions=denied(%s); ', sqlstate);
  end;
  execute 'reset role';

  -- 3) aal2 لكن التحقق قبل 13 ساعة
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', v_now - 13*3600)))::text, true);
  execute 'set local role authenticated';
  r := r || format('aal2 stale(13h): is_staff=%s is_admin=%s; ', public.is_staff(), public.is_admin());
  execute 'reset role';

  -- 4) يدّعي aal2 دون totp في amr
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'password', 'timestamp', v_now)))::text, true);
  execute 'set local role authenticated';
  r := r || format('aal2 no-totp: is_staff=%s; ', public.is_staff());
  execute 'reset role';

  -- 5) amr بصيغة نصوص (RFC 8176) — يجب أن يُرفض بأمان لا أن يتعطل
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array('totp'))::text, true);
  execute 'set local role authenticated';
  r := r || format('aal2 string-amr: is_staff=%s; ', public.is_staff());
  execute 'reset role';

  -- 6) زائر غير مسجل
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  r := r || format('anon: is_staff=%s; ', public.is_staff());
  select count(*) into n from public.listings;
  r := r || format('anon listings visible=%s; ', n);
  execute 'reset role';

  -- 7) الخادم يستطيع إنهاء الجلسات
  execute 'set local role service_role';
  perform public.revoke_user_sessions('00000000-0000-0000-0000-000000000000');
  r := r || 'service_role revoke_user_sessions=ok; ';
  execute 'reset role';

  raise exception 'RESULT: %', r;
end
$test$;
