import { redirect } from "next/navigation";
import { getAdminCustomers } from "@/lib/admin-data";
export { supportPriorityLabels, supportStatusLabels, supportTopicLabels } from "@/lib/support-labels";
import type { SupportTicketPriority, SupportTicketStatus, SupportTicketTopic } from "@/lib/support-labels";
import { createAdminClient } from "@/lib/supabase/admin";

export type { SupportTicketPriority, SupportTicketStatus, SupportTicketTopic };

type TicketRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  created_by: string | null;
  subject: string;
  topic: SupportTicketTopic;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  ticket_id: string;
  organization_id: string;
  author_role: "client" | "admin" | "system";
  message: string;
  created_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  company_name: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
};

function formatDateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Nincs adat";
}

function getPreview(message: string | null) {
  if (!message) return "Nincs üzenet";
  return message.length > 150 ? `${message.slice(0, 150)}...` : message;
}

export type PortalSupportTicket = {
  id: string;
  messagePreview: string;
  projectName: string | null;
  status: SupportTicketStatus;
  subject: string;
  topic: SupportTicketTopic;
  updatedAt: string;
};

export type AdminSupportTicket = PortalSupportTicket & {
  customerName: string;
  priority: SupportTicketPriority;
};

export async function getPortalSupportTickets(): Promise<{ tickets: PortalSupportTicket[]; projects: { id: string; name: string }[] }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return { projects: [], tickets: [] };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?next=/portal/support");

  const { data: memberships } = await supabase.from("org_members").select("organization_id").eq("user_id", user.id);
  const organizationIds = (memberships ?? []).map((membership) => membership.organization_id as string);
  if (!organizationIds.length) return { projects: [], tickets: [] };

  const [{ data: ticketRows }, { data: messageRows }, { data: projectRows }] = await Promise.all([
    supabase.from("support_tickets").select("id, organization_id, project_id, created_by, subject, topic, status, priority, last_message_at, created_at, updated_at").in("organization_id", organizationIds).is("deleted_at", null).order("last_message_at", { ascending: false }),
    supabase.from("support_ticket_messages").select("id, ticket_id, organization_id, author_role, message, created_at").in("organization_id", organizationIds).is("deleted_at", null).order("created_at", { ascending: true }),
    supabase.from("projects").select("id, name").in("organization_id", organizationIds).is("deleted_at", null).order("name", { ascending: true }),
  ]);

  const messagesByTicket = new Map<string, MessageRow[]>();
  ((messageRows ?? []) as MessageRow[]).forEach((message) => {
    messagesByTicket.set(message.ticket_id, [...(messagesByTicket.get(message.ticket_id) ?? []), message]);
  });
  const projectsById = new Map(((projectRows ?? []) as ProjectRow[]).map((project) => [project.id, project.name]));

  return {
    projects: ((projectRows ?? []) as ProjectRow[]).map((project) => ({ id: project.id, name: project.name })),
    tickets: ((ticketRows ?? []) as TicketRow[]).map((ticket) => ({
      id: ticket.id,
      messagePreview: getPreview(messagesByTicket.get(ticket.id)?.[0]?.message ?? null),
      projectName: ticket.project_id ? projectsById.get(ticket.project_id) ?? null : null,
      status: ticket.status,
      subject: ticket.subject,
      topic: ticket.topic,
      updatedAt: formatDateTime(ticket.last_message_at),
    })),
  };
}

export async function getAdminSupportTickets(): Promise<{ canView: boolean; tickets: AdminSupportTicket[]; userEmail: string | null }> {
  const { isAdmin, userEmail } = await getAdminCustomers();
  if (!isAdmin) return { canView: false, tickets: [], userEmail };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { canView: true, tickets: [], userEmail };

  const [{ data: ticketRows }, { data: messageRows }, { data: organizationRows }, { data: projectRows }] = await Promise.all([
    adminSupabase.from("support_tickets").select("id, organization_id, project_id, created_by, subject, topic, status, priority, last_message_at, created_at, updated_at").is("deleted_at", null).order("last_message_at", { ascending: false }),
    adminSupabase.from("support_ticket_messages").select("id, ticket_id, organization_id, author_role, message, created_at").is("deleted_at", null).order("created_at", { ascending: true }),
    adminSupabase.from("organizations").select("id, name, company_name").is("deleted_at", null),
    adminSupabase.from("projects").select("id, name").is("deleted_at", null),
  ]);

  const messagesByTicket = new Map<string, MessageRow[]>();
  ((messageRows ?? []) as MessageRow[]).forEach((message) => {
    messagesByTicket.set(message.ticket_id, [...(messagesByTicket.get(message.ticket_id) ?? []), message]);
  });
  const organizationsById = new Map(((organizationRows ?? []) as OrganizationRow[]).map((organization) => [organization.id, organization.company_name ?? organization.name]));
  const projectsById = new Map(((projectRows ?? []) as ProjectRow[]).map((project) => [project.id, project.name]));

  return {
    canView: true,
    tickets: ((ticketRows ?? []) as TicketRow[]).map((ticket) => ({
      customerName: organizationsById.get(ticket.organization_id) ?? "Ismeretlen ügyfél",
      id: ticket.id,
      messagePreview: getPreview(messagesByTicket.get(ticket.id)?.[0]?.message ?? null),
      priority: ticket.priority,
      projectName: ticket.project_id ? projectsById.get(ticket.project_id) ?? null : null,
      status: ticket.status,
      subject: ticket.subject,
      topic: ticket.topic,
      updatedAt: formatDateTime(ticket.last_message_at),
    })),
    userEmail,
  };
}
