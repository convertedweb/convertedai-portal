import { redirect } from "next/navigation";
import { getAdminCustomers } from "@/lib/admin-data";
import { getCurrentAdminAccess } from "@/lib/admin-permissions";
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
  author_user_id: string | null;
  message: string;
  created_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  company_name: string | null;
  superadmin_only: boolean;
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
  messages: SupportTicketMessage[];
  projectName: string | null;
  status: SupportTicketStatus;
  subject: string;
  topic: SupportTicketTopic;
  updatedAt: string;
};

export type AdminSupportTicket = PortalSupportTicket & {
  customerName: string;
  priority: SupportTicketPriority;
  projectId: string | null;
};

export type SupportTicketMessage = {
  authorRole: "client" | "admin" | "system";
  createdAt: string;
  id: string;
  message: string;
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
    supabase.from("support_ticket_messages").select("id, ticket_id, organization_id, author_role, author_user_id, message, created_at").in("organization_id", organizationIds).is("deleted_at", null).order("created_at", { ascending: true }),
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
      messages: (messagesByTicket.get(ticket.id) ?? []).map((message) => ({
        authorRole: message.author_role,
        createdAt: formatDateTime(message.created_at),
        id: message.id,
        message: message.message,
      })),
      projectName: ticket.project_id ? projectsById.get(ticket.project_id) ?? null : null,
      status: ticket.status,
      subject: ticket.subject,
      topic: ticket.topic,
      updatedAt: formatDateTime(ticket.last_message_at),
    })),
  };
}

export async function getAdminSupportTickets(): Promise<{ canDelete: boolean; canView: boolean; tickets: AdminSupportTicket[]; userEmail: string | null }> {
  const { adminRole, isAdmin, userEmail } = await getAdminCustomers();
  if (!isAdmin) return { canDelete: false, canView: false, tickets: [], userEmail };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { canDelete: adminRole === "superadmin", canView: true, tickets: [], userEmail };

  const [{ data: ticketRows }, { data: messageRows }, { data: organizationRows }, { data: projectRows }] = await Promise.all([
    adminSupabase.from("support_tickets").select("id, organization_id, project_id, created_by, subject, topic, status, priority, last_message_at, created_at, updated_at").is("deleted_at", null).order("last_message_at", { ascending: false }),
    adminSupabase.from("support_ticket_messages").select("id, ticket_id, organization_id, author_role, author_user_id, message, created_at").is("deleted_at", null).order("created_at", { ascending: true }),
    adminSupabase.from("organizations").select("id, name, company_name, superadmin_only").is("deleted_at", null),
    adminSupabase.from("projects").select("id, name").is("deleted_at", null),
  ]);

  const visibleOrganizationRows = adminRole === "superadmin"
    ? (organizationRows ?? []) as OrganizationRow[]
    : ((organizationRows ?? []) as OrganizationRow[]).filter((organization) => !organization.superadmin_only);
  const visibleOrganizationIds = new Set(visibleOrganizationRows.map((organization) => organization.id));
  const visibleTickets = ((ticketRows ?? []) as TicketRow[]).filter((ticket) => visibleOrganizationIds.has(ticket.organization_id));
  const visibleTicketIds = new Set(visibleTickets.map((ticket) => ticket.id));
  const messagesByTicket = new Map<string, MessageRow[]>();
  ((messageRows ?? []) as MessageRow[]).filter((message) => visibleTicketIds.has(message.ticket_id)).forEach((message) => {
    messagesByTicket.set(message.ticket_id, [...(messagesByTicket.get(message.ticket_id) ?? []), message]);
  });
  const organizationsById = new Map(visibleOrganizationRows.map((organization) => [organization.id, organization.company_name ?? organization.name]));
  const projectsById = new Map(((projectRows ?? []) as ProjectRow[]).map((project) => [project.id, project.name]));

  return {
    canDelete: adminRole === "superadmin",
    canView: true,
    tickets: visibleTickets.map((ticket) => ({
      customerName: organizationsById.get(ticket.organization_id) ?? "Ismeretlen ügyfél",
      id: ticket.id,
      messagePreview: getPreview(messagesByTicket.get(ticket.id)?.[0]?.message ?? null),
      messages: (messagesByTicket.get(ticket.id) ?? []).map((message) => ({
        authorRole: message.author_role,
        createdAt: formatDateTime(message.created_at),
        id: message.id,
        message: message.message,
      })),
      priority: ticket.priority,
      projectId: ticket.project_id,
      projectName: ticket.project_id ? projectsById.get(ticket.project_id) ?? null : null,
      status: ticket.status,
      subject: ticket.subject,
      topic: ticket.topic,
      updatedAt: formatDateTime(ticket.last_message_at),
    })),
    userEmail,
  };
}

export async function getPortalSupportAlertCount() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return 0;
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: memberships } = await supabase.from("org_members").select("organization_id").eq("user_id", user.id);
  const organizationIds = (memberships ?? []).map((membership) => membership.organization_id as string);
  if (!organizationIds.length) return 0;

  const { count } = await supabase
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .in("organization_id", organizationIds)
    .in("status", ["open", "in_progress", "resolved"])
    .is("deleted_at", null);

  return count ?? 0;
}

export async function getAdminSupportAlertCount() {
  const { role } = await getCurrentAdminAccess();
  if (!role) return 0;
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return 0;

  let visibleOrganizationIds: string[] | null = null;
  if (role !== "superadmin") {
    const { data: organizations } = await adminSupabase.from("organizations").select("id").eq("superadmin_only", false).is("deleted_at", null);
    visibleOrganizationIds = (organizations ?? []).map((organization) => organization.id as string);
    if (!visibleOrganizationIds.length) return 0;
  }

  let query = adminSupabase
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress"])
    .is("deleted_at", null);
  if (visibleOrganizationIds) query = query.in("organization_id", visibleOrganizationIds);
  const { count } = await query;

  return count ?? 0;
}
