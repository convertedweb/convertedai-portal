import type { AdminRole } from "@/lib/admin-permissions";
import { buildBrandedEmail, getAdminRecipientGroups, getSiteUrl, getUsersByIds, sendNotificationEmail, uniqueRecipients, type EmailRecipient } from "@/lib/email-notifications";
import { taskPriorityLabels, taskStatusLabels, type TaskPriority, type TaskStatus } from "@/lib/project-management";
import type { SupabaseClient } from "@supabase/supabase-js";

type TaskCreatedNotificationInput = {
  actor: { email?: string | null; id: string; name?: string | null; role: AdminRole };
  adminSupabase: SupabaseClient;
  assigneeUserId?: string | null;
  customerName?: string | null;
  description?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  projectName: string | null;
  status: Exclude<TaskStatus, "archived">;
  taskId: string;
  title: string;
};

function splitEmails(value: string | undefined) {
  return (value ?? "").split(",").map((email) => email.trim()).filter(Boolean).map((email) => ({ email }));
}

export async function notifyTaskCreated(input: TaskCreatedNotificationInput) {
  try {
    const [groups, assigneeUsers] = await Promise.all([
      getAdminRecipientGroups(input.adminSupabase),
      input.assigneeUserId ? getUsersByIds(input.adminSupabase, [input.assigneeUserId]) : Promise.resolve([] as EmailRecipient[]),
    ]);
    const configuredSuperadmins = splitEmails(process.env.SUPERADMIN_NOTIFICATION_EMAILS);
    const superadmins = configuredSuperadmins.length ? configuredSuperadmins : groups.superadmins;
    const actorRecipient = input.actor.email ? [{ email: input.actor.email, id: input.actor.id, name: input.actor.name }] : await getUsersByIds(input.adminSupabase, [input.actor.id]);
    const recipients = uniqueRecipients([
      ...superadmins,
      ...(input.actor.role === "admin" ? actorRecipient : []),
      ...(input.actor.role === "superadmin" && !superadmins.length ? actorRecipient : []),
      ...assigneeUsers,
    ]);
    const url = `${getSiteUrl()}/admin/tasks/${input.taskId}`;
    const copy = buildBrandedEmail({
      actionLabel: "Új feladat jött létre",
      details: [
        ...(input.projectName ? [{ label: "Projekt", value: input.projectName }] : []),
        ...(input.customerName ? [{ label: "Ügyfél", value: input.customerName }] : []),
        { label: "Státusz", value: taskStatusLabels[input.status] },
        { label: "Prioritás", value: taskPriorityLabels[input.priority] },
        ...(input.dueDate ? [{ label: "Határidő", value: new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${input.dueDate}T00:00:00`)) }] : []),
      ],
      intro: "Új feladat került a projektmenedzserbe. A részleteket és az aktuális állapotot az admin felületen tudod megnyitni.",
      message: input.description,
      title: input.title,
      url,
    });
    await sendNotificationEmail({ ...copy, to: recipients });
  } catch (error) {
    console.error("Task creation notification failed", error);
  }
}
