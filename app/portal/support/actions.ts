"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logCustomerActivity } from "@/lib/activity-log";
import type { SupportTicketPriority, SupportTicketTopic } from "@/lib/support";
import { supportTopicLabels } from "@/lib/support-labels";
import { notifySupportTicket } from "@/lib/support-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateSupportTicketState = {
  error?: string;
  success?: string;
};

export type ReplySupportTicketState = {
  error?: string;
  success?: string;
};

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseTopic(value: FormDataEntryValue | null): SupportTicketTopic | null {
  return value === "general" || value === "project" || value === "phone" || value === "knowledge_base" || value === "billing" || value === "technical" ? value : null;
}

function parsePriority(value: FormDataEntryValue | null): SupportTicketPriority {
  return value === "low" || value === "high" || value === "urgent" ? value : "normal";
}

type AdminSupabaseClient = NonNullable<ReturnType<typeof createAdminClient>>;

async function resolveSupportTaskProject(
  adminSupabase: AdminSupabaseClient,
  organizationId: string,
  requestedProjectId: string | null,
) {
  if (requestedProjectId) return requestedProjectId;

  const { data: existingProject } = await adminSupabase
    .from("projects")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("project_type", "internal")
    .eq("name", "Ügyféltámogatás")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (existingProject) return existingProject.id as string;

  const { data: supportProject, error } = await adminSupabase
    .from("projects")
    .insert({
      category: "automation",
      name: "Ügyféltámogatás",
      organization_id: organizationId,
      project_type: "internal",
      status: "building",
      visibility: "internal",
    })
    .select("id")
    .single();

  if (error || !supportProject) {
    console.error("Support task project create failed", error);
    return null;
  }

  return supportProject.id as string;
}

async function createProjectManagerTaskFromSupportTicket({
  adminSupabase,
  createdBy,
  message,
  organizationId,
  priority,
  projectId,
  subject,
  ticketId,
  topic,
}: {
  adminSupabase: AdminSupabaseClient;
  createdBy: string;
  message: string;
  organizationId: string;
  priority: SupportTicketPriority;
  projectId: string | null;
  subject: string;
  ticketId: string;
  topic: SupportTicketTopic;
}) {
  const routeToAdmin = topic === "general" || topic === "billing";
  const [{ data: adminRoles }, { data: legacySuperadmins }] = await Promise.all([
    adminSupabase.from("admin_roles").select("user_id, role, created_at").order("created_at", { ascending: true }),
    adminSupabase.from("super_admins").select("user_id, created_at").order("created_at", { ascending: true }),
  ]);

  const regularAdminId = adminRoles?.find((entry) => entry.role === "admin")?.user_id as string | undefined;
  const superadminId = (legacySuperadmins?.[0]?.user_id
    ?? adminRoles?.find((entry) => entry.role === "superadmin")?.user_id) as string | undefined;
  const assigneeUserId = routeToAdmin ? regularAdminId ?? superadminId : superadminId ?? regularAdminId;
  const taskProjectId = await resolveSupportTaskProject(adminSupabase, organizationId, projectId);

  if (!taskProjectId || !assigneeUserId) {
    console.error("Support task routing failed", { hasAssignee: Boolean(assigneeUserId), hasProject: Boolean(taskProjectId), ticketId });
    return false;
  }

  const { error } = await adminSupabase.from("tasks").insert({
    assignee_user_id: assigneeUserId,
    created_by: createdBy,
    description: `Téma: ${supportTopicLabels[topic]}\n\n${message}`,
    organization_id: organizationId,
    priority,
    project_id: taskProjectId,
    source_ticket_id: ticketId,
    title: subject,
    visibility: routeToAdmin ? "internal" : "superadmin_only",
  });

  if (error) {
    console.error("Automatic support task create failed", error);
    return false;
  }

  return true;
}

export async function createSupportTicket(_previousState: CreateSupportTicketState, formData: FormData): Promise<CreateSupportTicketState> {
  const subject = text(formData.get("subject"));
  const message = text(formData.get("message"));
  const projectId = text(formData.get("projectId")) || null;
  const topic = parseTopic(formData.get("topic"));
  const priority = parsePriority(formData.get("priority"));

  if (!subject || !message || !topic) {
    return { error: "Add meg a témát, tárgyat és az üzenetet." };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?next=/portal/support");

  const { data: membership, error: membershipError } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (membershipError || !membership) {
    return { error: "Nem található ügyfélfiók ehhez a felhasználóhoz." };
  }

  const organizationId = membership.organization_id as string;
  const adminSupabase = createAdminClient();
  const { data: project } = projectId && adminSupabase
    ? await adminSupabase.from("projects").select("name").eq("id", projectId).maybeSingle()
    : { data: null };
  const now = new Date().toISOString();
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      created_by: user.id,
      last_message_at: now,
      organization_id: organizationId,
      priority,
      project_id: projectId,
      subject,
      topic,
      updated_at: now,
    })
    .select("id")
    .single();

  if (ticketError || !ticket) {
    console.error("Support ticket create failed", ticketError);
    return { error: "Nem sikerült elküldeni az üzenetet." };
  }

  const { error: messageError } = await supabase
    .from("support_ticket_messages")
    .insert({
      author_role: "client",
      author_user_id: user.id,
      message,
      organization_id: organizationId,
      ticket_id: ticket.id,
    });

  if (messageError) {
    console.error("Support ticket message create failed", messageError);
    return { error: "A ticket létrejött, de az üzenetet nem sikerült menteni." };
  }

  const taskCreated = adminSupabase
    ? await createProjectManagerTaskFromSupportTicket({
        adminSupabase,
        createdBy: user.id,
        message,
        organizationId,
        priority,
        projectId,
        subject,
        ticketId: ticket.id,
        topic,
      })
    : false;

  await logCustomerActivity({
    eventType: "support_ticket_created",
    organizationId,
    projectId,
    supabase,
    title: "Támogatási üzenet érkezett",
    description: subject,
    metadata: { priority, ticketId: ticket.id, topic },
  });

  await notifySupportTicket({
    action: "created",
    adminSupabase,
    customerEmail: user.email,
    customerName: (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null,
    message,
    organizationId,
    priority,
    projectName: project?.name ?? null,
    status: "open",
    subject,
    ticketId: ticket.id,
    topic,
  });

  revalidatePath("/portal/support");
  revalidatePath("/admin/messages");
  revalidatePath("/admin/tasks");

  return { success: taskCreated ? "Üzenet elküldve." : "Üzenet elküldve, de a belső feladatot nem sikerült automatikusan létrehozni." };
}

export async function replySupportTicket(_previousState: ReplySupportTicketState, formData: FormData): Promise<ReplySupportTicketState> {
  const ticketId = text(formData.get("ticketId"));
  const message = text(formData.get("message"));

  if (!ticketId || !message) {
    return { error: "Írd be a választ." };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?next=/portal/support");

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id, organization_id, project_id, subject, status, priority, topic")
    .eq("id", ticketId)
    .is("deleted_at", null)
    .single();

  if (ticketError || !ticket) {
    return { error: "Nem található ez az üzenet." };
  }

  if (ticket.status === "closed") {
    return { error: "Lezárt üzenethez már nem lehet válaszolni." };
  }

  const now = new Date().toISOString();
  const { error: messageError } = await supabase
    .from("support_ticket_messages")
    .insert({
      author_role: "client",
      author_user_id: user.id,
      message,
      organization_id: ticket.organization_id,
      ticket_id: ticket.id,
    });

  if (messageError) {
    console.error("Support reply create failed", messageError);
    return { error: "Nem sikerült elküldeni a választ." };
  }

  const adminSupabase = createAdminClient();
  const { error: updateError } = await (adminSupabase ?? supabase)
    .from("support_tickets")
    .update({ last_message_at: now, status: "open", updated_at: now })
    .eq("id", ticket.id);

  if (updateError) {
    console.error("Support ticket reply timestamp update failed", updateError);
  }

  await logCustomerActivity({
    eventType: "support_ticket_replied",
    organizationId: ticket.organization_id,
    projectId: ticket.project_id,
    supabase,
    title: "Ügyfél válaszolt egy támogatási üzenetre",
    description: ticket.subject,
    metadata: { ticketId: ticket.id },
  });

  const { data: project } = ticket.project_id && adminSupabase
    ? await adminSupabase.from("projects").select("name").eq("id", ticket.project_id).maybeSingle()
    : { data: null };

  await notifySupportTicket({
    action: "client_replied",
    adminSupabase,
    customerEmail: user.email,
    customerName: (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null,
    message,
    organizationId: ticket.organization_id,
    priority: ticket.priority,
    projectName: project?.name ?? null,
    status: "open",
    subject: ticket.subject,
    ticketId: ticket.id,
    topic: ticket.topic,
  });

  revalidatePath("/portal/support");
  revalidatePath("/admin/messages");

  return { success: "Válasz elküldve." };
}
