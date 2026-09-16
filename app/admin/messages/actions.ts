"use server";

import { revalidatePath } from "next/cache";
import { logAdminActivity } from "@/lib/activity-log";
import { canManageCustomers, getCurrentAdminAccess } from "@/lib/admin-permissions";
import type { SupportTicketStatus } from "@/lib/support";
import { notifySupportTicket } from "@/lib/support-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateSupportTicketState = {
  error?: string;
  success?: string;
};

export type ReplySupportTicketState = {
  error?: string;
  success?: string;
};

export type DeleteSupportTicketState = {
  error?: string;
  success?: string;
};

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseStatus(value: FormDataEntryValue | null): SupportTicketStatus | null {
  return value === "open" || value === "in_progress" || value === "resolved" || value === "closed" ? value : null;
}

export async function updateSupportTicketStatus(_previousState: UpdateSupportTicketState, formData: FormData): Promise<UpdateSupportTicketState> {
  const ticketId = text(formData.get("ticketId"));
  const status = parseStatus(formData.get("status"));

  if (!ticketId || !status) return { error: "Hiányzik a ticket vagy státusz." };

  const access = await getCurrentAdminAccess();
  if (!access.user) return { error: "A módosításhoz újra be kell jelentkezni." };
  if (!canManageCustomers(access.role, access.permissions)) return { error: "Üzeneteket csak admin módosíthat." };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase szerveroldali kulcs." };

  const now = new Date().toISOString();
  const { data: ticket, error } = await adminSupabase
    .from("support_tickets")
    .update({ status, updated_at: now })
    .eq("id", ticketId)
    .is("deleted_at", null)
    .select("id, organization_id, project_id, subject")
    .single();

  if (error || !ticket) {
    console.error("Support ticket status update failed", error);
    return { error: "Nem sikerült módosítani az üzenet státuszát." };
  }

  await logAdminActivity({
    actorUserId: access.user.id,
    eventType: "support_ticket_status_updated",
    organizationId: ticket.organization_id,
    projectId: ticket.project_id,
    title: "Támogatási üzenet státusza módosítva",
    description: ticket.subject,
    metadata: { status, ticketId },
  });

  revalidatePath("/admin/messages");
  revalidatePath("/portal/support");

  return { success: "Státusz mentve." };
}

export async function replySupportTicketAsAdmin(_previousState: ReplySupportTicketState, formData: FormData): Promise<ReplySupportTicketState> {
  const ticketId = text(formData.get("ticketId"));
  const message = text(formData.get("message"));

  if (!ticketId || !message) {
    return { error: "Írd be a választ." };
  }

  const access = await getCurrentAdminAccess();
  if (!access.user) return { error: "A válaszhoz újra be kell jelentkezni." };
  if (!canManageCustomers(access.role, access.permissions)) return { error: "Üzenetekre csak admin válaszolhat." };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase szerveroldali kulcs." };

  const { data: ticket, error: ticketError } = await adminSupabase
    .from("support_tickets")
    .select("id, organization_id, project_id, subject, status, priority, topic")
    .eq("id", ticketId)
    .is("deleted_at", null)
    .single();

  if (ticketError || !ticket) {
    return { error: "Nem található ez az üzenet." };
  }

  const now = new Date().toISOString();
  const { error: messageError } = await adminSupabase
    .from("support_ticket_messages")
    .insert({
      author_role: "admin",
      author_user_id: access.user.id,
      message,
      organization_id: ticket.organization_id,
      ticket_id: ticket.id,
    });

  if (messageError) {
    console.error("Admin support reply create failed", messageError);
    return { error: "Nem sikerült elküldeni a választ." };
  }

  const { error: updateError } = await adminSupabase
    .from("support_tickets")
    .update({ last_message_at: now, status: "resolved", updated_at: now })
    .eq("id", ticket.id);

  if (updateError) {
    console.error("Admin support reply timestamp update failed", updateError);
  }

  await logAdminActivity({
    actorUserId: access.user.id,
    eventType: "support_ticket_admin_replied",
    organizationId: ticket.organization_id,
    projectId: ticket.project_id,
    title: "Admin válaszolt egy támogatási üzenetre",
    description: ticket.subject,
    metadata: { ticketId: ticket.id },
  });

  const { data: project } = ticket.project_id
    ? await adminSupabase.from("projects").select("name").eq("id", ticket.project_id).maybeSingle()
    : { data: null };

  await notifySupportTicket({
    action: "admin_replied",
    adminSupabase,
    customerEmail: null,
    message,
    organizationId: ticket.organization_id,
    priority: ticket.priority,
    projectName: project?.name ?? null,
    status: "resolved",
    subject: ticket.subject,
    ticketId: ticket.id,
    topic: ticket.topic,
  });

  revalidatePath("/admin/messages");
  revalidatePath("/portal/support");

  return { success: "Válasz elküldve." };
}

export async function deleteSupportTicket(_previousState: DeleteSupportTicketState, formData: FormData): Promise<DeleteSupportTicketState> {
  const ticketId = text(formData.get("ticketId"));
  if (!ticketId) return { error: "Hiányzik az üzenet azonosítója." };

  const access = await getCurrentAdminAccess();
  if (!access.user) return { error: "A törléshez újra be kell jelentkezni." };
  if (access.role !== "superadmin") return { error: "Üzenetet csak superadmin törölhet." };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase szerveroldali kulcs." };

  const { data: ticket, error: ticketError } = await adminSupabase
    .from("support_tickets")
    .select("id, organization_id, project_id, subject")
    .eq("id", ticketId)
    .is("deleted_at", null)
    .single();

  if (ticketError || !ticket) {
    return { error: "Nem található ez az üzenet." };
  }

  const deletedAt = new Date().toISOString();
  const { error: ticketDeleteError } = await adminSupabase
    .from("support_tickets")
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq("id", ticket.id)
    .is("deleted_at", null);

  if (ticketDeleteError) {
    console.error("Support ticket delete failed", ticketDeleteError);
    return { error: "Nem sikerült törölni az üzenetet." };
  }

  const { error: messageDeleteError } = await adminSupabase
    .from("support_ticket_messages")
    .update({ deleted_at: deletedAt })
    .eq("ticket_id", ticket.id)
    .is("deleted_at", null);

  if (messageDeleteError) {
    console.error("Support ticket messages delete failed", messageDeleteError);
  }

  await logAdminActivity({
    actorUserId: access.user.id,
    eventType: "support_ticket_deleted",
    organizationId: ticket.organization_id,
    projectId: ticket.project_id,
    title: "Támogatási üzenet törölve",
    description: ticket.subject,
    metadata: { deletedAt, ticketId: ticket.id },
  });

  revalidatePath("/admin/messages");
  revalidatePath("/portal/support");

  return { success: "Üzenet törölve." };
}
