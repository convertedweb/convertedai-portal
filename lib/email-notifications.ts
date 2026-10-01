import type { SupabaseClient } from "@supabase/supabase-js";

export type EmailRecipient = { email: string; id?: string; name?: string | null };

export function uniqueRecipients(recipients: EmailRecipient[]) {
  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    const email = recipient.email.trim().toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export async function getUsersByIds(adminSupabase: SupabaseClient | null, userIds: string[]) {
  if (!adminSupabase || !userIds.length) return [] as EmailRecipient[];
  const ids = [...new Set(userIds)];
  const { data, error } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("Email recipient lookup failed", error);
    return [] as EmailRecipient[];
  }
  return data.users.filter((user) => ids.includes(user.id) && user.email).map((user) => ({
    email: user.email as string,
    id: user.id,
    name: (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null,
  }));
}

export async function getAdminRecipientGroups(adminSupabase: SupabaseClient | null) {
  if (!adminSupabase) return { admins: [] as EmailRecipient[], superadmins: [] as EmailRecipient[] };
  const [{ data: roleRows, error: roleError }, { data: legacyRows, error: legacyError }] = await Promise.all([
    adminSupabase.from("admin_roles").select("user_id, role"),
    adminSupabase.from("super_admins").select("user_id"),
  ]);
  if (roleError || legacyError) console.error("Admin email recipient role lookup failed", roleError ?? legacyError);
  const superadminIds = new Set([
    ...((roleRows ?? []) as { role: string; user_id: string }[]).filter((row) => row.role === "superadmin").map((row) => row.user_id),
    ...((legacyRows ?? []) as { user_id: string }[]).map((row) => row.user_id),
  ]);
  const adminIds = ((roleRows ?? []) as { role: string; user_id: string }[]).filter((row) => row.role === "admin" && !superadminIds.has(row.user_id)).map((row) => row.user_id);
  const users = await getUsersByIds(adminSupabase, [...adminIds, ...superadminIds]);
  return {
    admins: users.filter((user) => user.id && adminIds.includes(user.id)),
    superadmins: users.filter((user) => user.id && superadminIds.has(user.id)),
  };
}

export function buildBrandedEmail({ actionLabel, details, emailSubject, intro, message, title, url }: { actionLabel: string; details: { label: string; value: string }[]; emailSubject?: string; intro: string; message?: string | null; title: string; url: string }) {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeMessage = message ? escapeHtml(message.length > 1200 ? `${message.slice(0, 1200)}…` : message).replace(/\n/g, "<br>") : "";
  const safeUrl = escapeHtml(url);
  const detailRows = details.map((detail) => `<tr><td style="padding:6px 0;color:#9995a4;font-size:12px;width:112px;vertical-align:top;">${escapeHtml(detail.label)}</td><td style="padding:6px 0;color:#272431;font-size:13px;font-weight:600;vertical-align:top;">${escapeHtml(detail.value)}</td></tr>`).join("");
  const textDetails = details.map((detail) => `${detail.label}: ${detail.value}`).join("\n");
  const subject = emailSubject ?? `${actionLabel}: ${title}`;
  const text = `${actionLabel}\n\n${intro}\n\n${title}\n${textDetails}${message ? `\n\nÜzenet:\n${message}` : ""}\n\nMegnyitás: ${url}`;
  const html = `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#272431;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="height:10px;background:linear-gradient(90deg,#fff4f1 0%,#f5eaff 45%,#edf1ff 100%);"></td></tr><tr><td align="center" style="padding:48px 18px 36px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;"><tr><td style="padding:0 6px 22px;"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="width:28px;"><span style="display:inline-block;width:12px;height:12px;border:3px solid #6d5ce8;border-radius:50%;box-shadow:0 0 0 3px #ece9ff;"></span></td><td><div style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#6557d9;text-transform:uppercase;">Ügyfél Portál</div></td></tr></table></td></tr><tr><td style="border:1px solid #e8e5eb;border-radius:18px;overflow:hidden;"><div style="padding:27px 30px;background:linear-gradient(135deg,#fff8f5 0%,#faf5ff 52%,#f4f6ff 100%);border-bottom:1px solid #ebe7ef;"><div style="font-size:24px;font-weight:700;line-height:1.3;color:#25222c;">${escapeHtml(actionLabel)}</div><p style="margin:10px 0 0;color:#77727e;font-size:14px;line-height:1.6;">${safeIntro}</p></div><div style="padding:28px 30px;background:#ffffff;"><h1 style="font-size:19px;line-height:1.4;margin:0 0 14px;color:#24212a;">${safeTitle}</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${detailRows}</table>${message ? `<div style="background:#faf9fc;border:1px solid #ece9f0;border-radius:11px;color:#393541;font-size:14px;line-height:1.65;margin-top:19px;padding:16px 18px;">${safeMessage}</div>` : ""}</div></td></tr><tr><td align="center" style="padding:25px 0 0;"><a href="${safeUrl}" style="display:block;max-width:360px;background:#6248e8;border-radius:9px;color:#ffffff;font-size:14px;font-weight:700;padding:13px 20px;text-align:center;text-decoration:none;">Megnyitás az Ügyfél Portálon</a><p style="color:#9a969f;font-size:12px;line-height:1.5;margin:15px 0 0;">Az üzenet részleteit és a válaszlehetőséget a portálon találod.</p></td></tr><tr><td align="center" style="padding:34px 0 0;color:#aaa6ae;font-size:11px;line-height:1.5;">Ez egy automatikus értesítés az Ügyfél Portál rendszeréből.</td></tr></table></td></tr></table></body></html>`;
  return { html, subject, text };
}

export async function sendNotificationEmail({ html, subject, text, to }: { html: string; subject: string; text: string; to: EmailRecipient[] }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_EMAIL_FROM ?? process.env.SUPPORT_EMAIL_FROM;
  const recipients = uniqueRecipients(to);
  if (!apiKey || !from || !recipients.length) {
    console.warn("Email notification skipped: missing RESEND_API_KEY, sender or recipients.");
    return { sent: false };
  }
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({ from, html, subject, text, to: recipients.map((recipient) => recipient.email) }),
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    console.error("Email notification send failed", await response.text());
    return { sent: false };
  }
  return { sent: true };
}
