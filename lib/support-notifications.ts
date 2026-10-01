import { supportPriorityLabels, supportStatusLabels, supportTopicLabels } from "@/lib/support-labels";
import type { SupportTicketPriority, SupportTicketStatus, SupportTicketTopic } from "@/lib/support-labels";
import { buildBrandedEmail, getAdminRecipientGroups, sendNotificationEmail } from "@/lib/email-notifications";
import type { SupabaseClient } from "@supabase/supabase-js";

type TicketNotificationInput = {
  action: "created" | "client_replied" | "admin_replied";
  adminSupabase: SupabaseClient | null;
  customerEmail?: string | null;
  customerName?: string | null;
  customerUserId?: string | null;
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

async function getInternalRecipients(input: TicketNotificationInput) {
  const groups = await getAdminRecipientGroups(input.adminSupabase);
  const configuredAdmins = splitEmails(process.env.SUPPORT_ADMIN_EMAILS ?? process.env.ADMIN_NOTIFICATION_EMAILS).map((email) => ({ email }));
  const configuredSuperadmins = splitEmails(process.env.SUPERADMIN_NOTIFICATION_EMAILS).map((email) => ({ email }));
  const admins = configuredAdmins.length ? configuredAdmins : groups.admins;
  const superadmins = configuredSuperadmins.length ? configuredSuperadmins : groups.superadmins;
  const notifyAdmins = input.action === "admin_replied" || input.topic === "billing" || input.topic === "general";
  return uniqueRecipients([...superadmins, ...(notifyAdmins ? admins : [])]);
}

async function getCustomerRecipients(adminSupabase: SupabaseClient | null, customerUserId?: string | null, fallback?: Recipient | null) {
  const recipients = fallback?.email ? [fallback] : [];
  return uniqueRecipients([...recipients, ...(customerUserId ? await getUsersByIds(adminSupabase, [customerUserId]) : [])]);
}

function buildNotificationCopy(input: TicketNotificationInput, audience: "admin" | "customer") {
  const link = `${getSiteUrl()}${audience === "admin" ? "/admin/messages" : "/portal/support"}`;
  const actionLabel = input.action === "created" ? "Új támogatási üzenet érkezett" : input.action === "client_replied" ? "Új ügyfél válasz érkezett" : "Admin válasz érkezett";
  const customerActionLabel = input.action === "admin_replied" ? "Válasz érkezett az Ügyfél Portálon" : input.action === "client_replied" ? "Válaszodat elküldtük az Ügyfél Portálra" : "Új üzenetet küldtél az Ügyfél Portálra";
  const displayLabel = audience === "customer" ? customerActionLabel : actionLabel;
  const details = [
    { label: "Projekt", value: input.projectName ?? "Nincs kapcsolt projekt" },
    ...(input.topic ? [{ label: "Téma", value: supportTopicLabels[input.topic] }] : []),
    ...(audience === "admin" && input.priority ? [{ label: "Prioritás", value: supportPriorityLabels[input.priority] }] : []),
    ...(audience === "admin" && input.status ? [{ label: "Státusz", value: supportStatusLabels[input.status] }] : []),
  ];
  const customerIntro = input.action === "admin_replied"
    ? "Az admin válaszolt az üzenetedre. A teljes beszélgetést az ügyfélportálon tudod megnyitni."
    : "Megkaptuk az üzenetedet. A választ az ügyfélportálon tudod majd ellenőrizni, és e-mailben is értesítünk, ha az admin válaszolt.";
  return buildBrandedEmail({
    actionLabel: displayLabel,
    details,
    emailSubject: audience === "customer" && input.action === "created" ? "Új üzenetet küldtél az Ügyfél Portálra" : undefined,
    intro: audience === "customer" ? customerIntro : "Új esemény történt egy támogatási ticketben. A részleteket az admin felületen tudod megnyitni.",
    message: input.message,
    title: input.subject,
    url: link,
  });
}

export async function notifySupportTicket(input: TicketNotificationInput) {
  try {
    const [adminRecipients, customerRecipients] = await Promise.all([
      getInternalRecipients(input),
      getCustomerRecipients(input.adminSupabase, input.customerUserId, input.customerEmail ? { email: input.customerEmail, name: input.customerName } : null),
    ]);

    const adminCopy = buildNotificationCopy(input, "admin");
    const customerCopy = buildNotificationCopy(input, "customer");

    await Promise.all([
      sendNotificationEmail({ ...adminCopy, to: adminRecipients }),
      sendNotificationEmail({ ...customerCopy, to: customerRecipients }),
    ]);
  } catch (error) {
    console.error("Support notification failed", error);
  }
}
