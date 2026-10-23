# قوالب بريد الدخول (Supabase)

انسخ كل قالب إلى: **Authentication → Emails → Templates** في لوحة Supabase.

هذه القوالب تستخدم رابطاً يعمل من أي جهاز، حتى لو فتح المستخدم البريد من جواله وسجّل من الكمبيوتر.

---

## Confirm signup — تفعيل الحساب

**Subject:**

```
فعّل حسابك في الشاهين لإدارة الأملاك
```

**Body:**

```html
<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#2b2118;max-width:520px">
  <p style="font-size:18px;font-weight:700;color:#3c4a21">الشاهين لإدارة الأملاك</p>
  <h2 style="font-size:18px">أهلاً بك</h2>
  <p>اضغط الزر لتفعيل حسابك وإكمال التسجيل.</p>
  <p>
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account"
       style="background:#4e5f2c;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;display:inline-block;font-weight:600">
      فعّل الحساب
    </a>
  </p>
  <p style="font-size:13px;color:#6b5e50">إن لم تنشئ حساباً لدينا فتجاهل هذه الرسالة.</p>
</div>
```

---

## Reset password — تعيين كلمة المرور

**Subject:**

```
تعيين كلمة مرور جديدة
```

**Body:**

```html
<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#2b2118;max-width:520px">
  <p style="font-size:18px;font-weight:700;color:#3c4a21">الشاهين لإدارة الأملاك</p>
  <h2 style="font-size:18px">تعيين كلمة مرور جديدة</h2>
  <p>طلبت تعيين كلمة مرور جديدة لحسابك. الرابط صالح لمدة محدودة.</p>
  <p>
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password"
       style="background:#4e5f2c;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;display:inline-block;font-weight:600">
      عيّن كلمة المرور
    </a>
  </p>
  <p style="font-size:13px;color:#6b5e50">إن لم تطلب ذلك فتجاهل الرسالة، وكلمة مرورك الحالية تبقى كما هي.</p>
</div>
```
