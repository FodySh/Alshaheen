import { AddStaffForm } from "@/components/dashboard/AdminForms";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ConfirmForm } from "@/components/forms/ConfirmForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { StatusBadge } from "@/components/StatusBadge";
import { updateStaff } from "@/lib/actions/staff";
import { requireAdmin } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const metadata = { title: "الفريق" };

export default async function TeamPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, is_active, created_at")
    .in("role", ["agent", "admin"])
    .order("role")
    .order("full_name");
  const staff = (data ?? []) as Profile[];

  return (
    <div>
      <PageHeader title="الفريق" lead="الوسيط يرى الطلبات المسندة إليه وعروضه ومواعيده. المدير يرى كل شيء ويسند الطلبات." />
      <section className="panel p-5">
        <AddStaffForm />
      </section>
      <div className="panel mt-6 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>التواصل</th>
              <th>الصلاحية</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.full_name || "—"}{s.id === me.id && <span className="ms-2 text-xs text-ink-soft">(أنت)</span>}</td>
                <td className="text-sm">
                  <span className="block" dir="ltr" style={{ textAlign: "right" }}>{s.email}</span>
                  <span className="num block text-ink-soft" dir="ltr" style={{ textAlign: "right" }}>{s.phone}</span>
                </td>
                <td>{ROLE_LABEL[s.role]}</td>
                <td><StatusBadge tone={s.is_active ? "olive" : "muted"}>{s.is_active ? "نشط" : "معطّل"}</StatusBadge></td>
                <td>
                  {s.id !== me.id && (
                    <div className="flex flex-wrap justify-end gap-1">
                      <form action={updateStaff}>
                        <input type="hidden" name="user_id" value={s.id} />
                        <input type="hidden" name="role" value={s.role === "admin" ? "agent" : "admin"} />
                        <input type="hidden" name="active" value={String(s.is_active)} />
                        <SubmitButton className="btn btn-quiet btn-sm">{s.role === "admin" ? "اجعله وسيطاً" : "اجعله مديراً"}</SubmitButton>
                      </form>
                      <form action={updateStaff}>
                        <input type="hidden" name="user_id" value={s.id} />
                        <input type="hidden" name="role" value={s.role} />
                        <input type="hidden" name="active" value={String(!s.is_active)} />
                        <SubmitButton className="btn btn-quiet btn-sm">{s.is_active ? "عطّل" : "فعّل"}</SubmitButton>
                      </form>
                      <ConfirmForm action={updateStaff} message="إزالة الموظف من الفريق؟ يبقى حسابه كزائر.">
                        <input type="hidden" name="user_id" value={s.id} />
                        <input type="hidden" name="role" value="visitor" />
                        <SubmitButton className="btn btn-quiet btn-sm text-danger">أزل</SubmitButton>
                      </ConfirmForm>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-soft">قبل إزالة وسيط، أعد إسناد طلباته وعروضه لغيره.</p>
    </div>
  );
}
