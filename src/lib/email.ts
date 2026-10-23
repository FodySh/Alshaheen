import "server-only";
import { Resend } from "resend";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

type Mail = {
  to: string | null | undefined | (string | null | undefined)[];
  subject: string;
  heading: string;
  lines: string[];
  action?: { label: string; path: string };
};

function render({ heading, lines, action }: Mail) {
  const body = lines.map((l) => `<p style="margin:0 0 12px">${escapeHtml(l)}</p>`).join("");
  const button = action
    ? `<p style="margin:24px 0 0"><a href="${SITE}${action.path}" style="background:#4e5f2c;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;display:inline-block;font-weight:600">${escapeHtml(action.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#efe7da;padding:24px;font-family:Tahoma,Arial,sans-serif;color:#2b2118">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:28px;line-height:1.8;font-size:15px">
<p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#3c4a21">الشاهين لإدارة الأملاك</p>
<h1 style="font-size:18px;margin:0 0 16px">${escapeHtml(heading)}</h1>${body}${button}
</div>
<p style="max-width:560px;margin:12px auto 0;font-size:12px;color:#6b5e50;text-align:center">رسالة آلية من منصة الشاهين لإدارة الأملاك</p>
</body></html>`;
}

/** يرسل بريداً إن كان Resend مضبوطاً؛ وإلا يكتب في السجل. لا يرمي أخطاء. */
export async function sendMail(mail: Mail) {
  const to = (Array.isArray(mail.to) ? mail.to : [mail.to]).filter((x): x is string => !!x);
  if (to.length === 0) return;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info(`[email:skipped] to=${to.join(",")} subject="${mail.subject}"`);
    return;
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from, to, subject: mail.subject, html: render(mail) });
    if (error) console.error("[email:error]", error.message);
  } catch (e) {
    console.error("[email:error]", e instanceof Error ? e.message : e);
  }
}

export const officeEmail = () => process.env.OFFICE_NOTIFY_EMAIL ?? null;
