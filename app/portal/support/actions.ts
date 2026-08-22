"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logCustomerActivity } from "@/lib/activity-log";
import type { SupportTicketPriority, SupportTicketTopic } from "@/lib/support";

export type CreateSupportTicketState = {
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

  await logCustomerActivity({
    eventType: "support_ticket_created",
    organizationId,
    projectId,
    supabase,
    title: "Támogatási üzenet érkezett",
    description: subject,
    metadata: { priority, ticketId: ticket.id, topic },
  });

  revalidatePath("/portal/support");
  revalidatePath("/admin/messages");

  return { success: "Üzenet elküldve." };
}
