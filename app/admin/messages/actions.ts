"use server";

import { revalidatePath } from "next/cache";
import { logAdminActivity } from "@/lib/activity-log";
import { canManageCustomers, getCurrentAdminAccess } from "@/lib/admin-permissions";
import type { SupportTicketStatus } from "@/lib/support";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateSupportTicketState = {
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
