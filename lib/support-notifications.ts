import { supportPriorityLabels, supportStatusLabels, supportTopicLabels } from "@/lib/support-labels";
import type { SupportTicketPriority, SupportTicketStatus, SupportTicketTopic } from "@/lib/support-labels";
import type { SupabaseClient } from "@supabase/supabase-js";

type TicketNotificationInput = {
  action: "created" | "client_replied" | "admin_replied";
  adminSupabase: SupabaseClient | null;
  customerEmail?: string | null;
  customerName?: string | null;
  message: string;
  organizationId: string;
  priority?: SupportTicketPriority;
  projectName?: string | null;
  status?: SupportTicketStatus;
  subject: string;
  ticketId: string;
  topic?: SupportTicketTopic;
};

type Recipient = {
  email: string;
  name?: string | null;
};

function splitEmails(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueRecipients(recipients: Recipient[]) {
  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    const email = recipient.email.toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getUsersByIds(adminSupabase: SupabaseClient | null, userIds: string[]) {
  if (!adminSupabase || !userIds.length) return [];

  const uniqueUserIds = Array.from(new Set(userIds));
  const { data, error } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    console.error("Support notification user lookup failed", error);
    return [];
  }

  return data.users
    .filter((user) => uniqueUserIds.includes(user.id) && user.email)
    .map((user) => ({
      email: user.email as string,
      name: (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null,
    }));
}

async function getAdminRecipients(adminSupabase: SupabaseClient | null) {
  const configured = splitEmails(process.env.SUPPORT_ADMIN_EMAILS ?? process.env.ADMIN_NOTIFICATION_EMAILS).map((email) => ({ email }));
  if (configured.length || !adminSupabase) return uniqueRecipients(configured);

  const [{ data: adminRoleRows }, { data: superAdminRows }] = await Promise.all([
    adminSupabase.from("admin_roles").select("user_id"),
    adminSupabase.from("super_admins").select("user_id"),
  ]);

  const userIds = [
    ...((adminRoleRows ?? []) as { user_id: string }[]).map((row) => row.user_id),
    ...((superAdminRows ?? []) as { user_id: string }[]).map((row) => row.user_id),
  ];

  return uniqueRecipients(await getUsersByIds(adminSupabase, userIds));
}

async function getCustomerRecipients(adminSupabase: SupabaseClient | null, organizationId: string, fallback?: Recipient | null) {
  const recipients = fallback?.email ? [fallback] : [];
  if (!adminSupabase) return uniqueRecipients(recipients);

  const { data: memberRows, error } = await adminSupabase
    .from("org_members")
    .select("user_id")
    .eq("organization_id", organizationId);

  if (error) {
    console.error("Support notification members lookup failed", error);
    return uniqueRecipients(recipients);
  }

  const userIds = ((memberRows ?? []) as { user_id: string }[]).map((row) => row.user_id);
  return uniqueRecipients([...recipients, ...(await getUsersByIds(adminSupabase, userIds))]);
}

async function sendEmail({ html, subject, text, to }: { html: string; subject: string; text: string; to: string[] }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SUPPORT_EMAIL_FROM ?? process.env.NOTIFICATION_EMAIL_FROM;

  if (!apiKey || !from || !to.length) {
    console.warn("Support notification skipped: missing RESEND_API_KEY, SUPPORT_EMAIL_FROM or recipients.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({ from, html, subject, text, to }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    console.error("Support notification send failed", await response.text());
  }
}

function buildNotificationCopy(input: TicketNotificationInput, audience: "admin" | "customer") {
  const link = `${getSiteUrl()}${audience === "admin" ? "/admin/messages" : "/portal/support"}`;
  const actionLabel = input.action === "created" ? "Új támogatási üzenet érkezett" : input.action === "client_replied" ? "Új ügyfél válasz érkezett" : "Admin válasz érkezett";
  const customerActionLabel = input.action === "admin_replied" ? "Válasz érkezett a norpheus AI csapatától" : input.action === "client_replied" ? "Válaszodat elküldtük a norpheus AI csapatának" : "Új üzenetet küldtél a norpheus AI csapatának";
  const displayLabel = audience === "customer" ? customerActionLabel : actionLabel;
  const subject = audience === "customer" ? `${displayLabel}: ${input.subject}` : `${actionLabel}: ${input.subject}`;
  const project = input.projectName ? `Projekt: ${input.projectName}` : "Projekt: nincs kapcsolt projekt";
  const topic = input.topic ? `Téma: ${supportTopicLabels[input.topic]}` : null;
  const priority = input.priority ? `Prioritás: ${supportPriorityLabels[input.priority]}` : null;
  const status = input.status ? `Státusz: ${supportStatusLabels[input.status]}` : null;
  const details = audience === "customer" ? [project, topic].filter(Boolean).join("\n") : [project, topic, priority, status].filter(Boolean).join("\n");
  const preview = input.message.length > 900 ? `${input.message.slice(0, 900)}...` : input.message;
  const customerIntro = input.action === "admin_replied"
    ? "Az admin válaszolt az üzenetedre. A teljes beszélgetést az ügyfélportálon tudod megnyitni."
    : "Megkaptuk az üzenetedet. A választ az ügyfélportálon tudod majd ellenőrizni, és e-mailben is értesítünk, ha az admin válaszolt.";
  const htmlDetails = escapeHtml(details).replace(/\n/g, "<br>");
  const htmlPreview = escapeHtml(preview).replace(/\n/g, "<br>");
  const htmlSubject = escapeHtml(input.subject);
  const htmlActionLabel = escapeHtml(displayLabel);
  const htmlIntro = escapeHtml(customerIntro);
  const htmlLink = escapeHtml(link);

  const text = audience === "customer"
    ? `${displayLabel}

${customerIntro}

Tárgy: ${input.subject}
${details}

Üzenet:
${preview}

Megnyitás az ügyfélportálon:
${link}
`
    : `${actionLabel}

Tárgy: ${input.subject}
${details}

Üzenet:
${preview}

Megnyitás:
${link}
`;

  const html = audience === "customer"
    ? `
    <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.55;">
      <h2 style="margin: 0 0 12px;">${htmlActionLabel}</h2>
      <p style="margin: 0 0 18px;">${htmlIntro}</p>
      <p><strong>Tárgy:</strong> ${htmlSubject}</p>
      <p>${htmlDetails}</p>
      <div style="border-left: 4px solid #6875e8; padding: 12px 16px; background: #f7f9fc; margin: 18px 0;">
        ${htmlPreview}
      </div>
      <p><a href="${htmlLink}" style="background: #6875e8; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">Megnyitás az ügyfélportálon</a></p>
    </div>
  `
    : `
    <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.55;">
      <h2 style="margin: 0 0 12px;">${htmlActionLabel}</h2>
      <p><strong>Tárgy:</strong> ${htmlSubject}</p>
      <p>${htmlDetails}</p>
      <div style="border-left: 4px solid #6875e8; padding: 12px 16px; background: #f7f9fc; margin: 18px 0;">
        ${htmlPreview}
      </div>
      <p><a href="${htmlLink}" style="background: #6875e8; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">Üzenet megnyitása</a></p>
    </div>
  `;

  return { html, subject, text };
}

export async function notifySupportTicket(input: TicketNotificationInput) {
  try {
    const [adminRecipients, customerRecipients] = await Promise.all([
      getAdminRecipients(input.adminSupabase),
      getCustomerRecipients(input.adminSupabase, input.organizationId, input.customerEmail ? { email: input.customerEmail, name: input.customerName } : null),
    ]);

    const adminCopy = buildNotificationCopy(input, "admin");
    const customerCopy = buildNotificationCopy(input, "customer");

    await Promise.all([
      sendEmail({ ...adminCopy, to: adminRecipients.map((recipient) => recipient.email) }),
      sendEmail({ ...customerCopy, to: customerRecipients.map((recipient) => recipient.email) }),
    ]);
  } catch (error) {
    console.error("Support notification failed", error);
  }
}
