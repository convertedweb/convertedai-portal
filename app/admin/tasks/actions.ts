"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity-log";
import { getCurrentAdminAccess } from "@/lib/admin-permissions";
import { taskStatuses, type TaskPriority, type TaskStatus } from "@/lib/project-management";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTaskCreated } from "@/lib/task-notifications";

export type TaskActionState = { error?: string; success?: string };
type TaskVisibility = "internal" | "client_visible" | "superadmin_only";

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePriority(value: string): TaskPriority | null {
  return value === "low" || value === "normal" || value === "high" || value === "urgent" ? value : null;
}

function parseStatus(value: string): TaskStatus | null {
  return value === "archived" || taskStatuses.some((status) => status === value) ? value as TaskStatus : null;
}

function parseDateRange(startDate: string, dueDate: string): string | null {
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return "Érvénytelen kezdő dátum.";
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return "Érvénytelen határidő.";
  if (startDate && dueDate && startDate > dueDate) return "A kezdő dátum nem lehet a határidő után.";
  return null;
}

function parseVisibility(value: string): TaskVisibility | null {
  return value === "internal" || value === "client_visible" || value === "superadmin_only" ? value : null;
}

export async function createTask(_previousState: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const projectId = text(formData.get("projectId"));
  const title = text(formData.get("title"));
  const description = text(formData.get("description"));
  const priority = parsePriority(text(formData.get("priority")));
  const visibility = parseVisibility(text(formData.get("visibility")));
  const dueDate = text(formData.get("dueDate"));
  const startDate = text(formData.get("startDate"));
  const assigneeUserId = text(formData.get("assigneeUserId")) || null;
  const notificationKey = text(formData.get("notificationKey")) || null;
  const initialStatusValue = text(formData.get("initialStatus")) || "backlog";
  const initialStatus = taskStatuses.find((status) => status === initialStatusValue) ?? null;

  if (!projectId || !title || !priority) return { error: "A projekt, a cím és a prioritás kötelező." };
  if (title.length > 300) return { error: "A feladat címe legfeljebb 300 karakter lehet." };
  if (!visibility) return { error: "Érvénytelen láthatóság." };
  if (!initialStatus) return { error: "Érvénytelen kezdeti státusz." };
  const dateError = parseDateRange(startDate, dueDate);
  if (dateError) return { error: dateError };

  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) return { error: "A művelethez admin jogosultság szükséges." };
  if (visibility === "superadmin_only" && access.role !== "superadmin") return { error: "Ezt a láthatóságot csak szuperadmin választhatja." };
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase szerveroldali kulcs." };

  if (assigneeUserId) {
    const [{ data: adminRole }, { data: superadmin }] = await Promise.all([
      adminSupabase.from("admin_roles").select("user_id").eq("user_id", assigneeUserId).limit(1).maybeSingle(),
      adminSupabase.from("super_admins").select("user_id").eq("user_id", assigneeUserId).limit(1).maybeSingle(),
    ]);
    if (!adminRole && !superadmin) return { error: "A kiválasztott felelős nem admin felhasználó." };
  }

  const { data: project } = await adminSupabase
    .from("projects")
    .select("id, organization_id, name")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!project) return { error: "A kiválasztott projekt nem található." };

  const { data: task, error } = await adminSupabase.from("tasks").insert({
    assignee_user_id: assigneeUserId,
    completed_at: initialStatus === "done" ? new Date().toISOString() : null,
    created_by: access.user.id,
    description,
    due_at: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
    organization_id: project.organization_id,
    priority,
    project_id: project.id,
    start_date: startDate || null,
    status: initialStatus,
    title,
    visibility,
  }).select("id").single();

  if (error || !task) {
    console.error("Task create failed", error);
    return { error: "Nem sikerült létrehozni a feladatot. Ellenőrizd, hogy a migráció lefutott-e." };
  }

  await logAdminActivity({
    actorUserId: access.user.id,
    description: title,
    eventType: "task_created",
    metadata: {
      assigneeUserId,
      dueAt: dueDate || null,
      notificationKey,
      priority,
      source: notificationKey ? "notification" : "manual",
      startDate: startDate || null,
      status: initialStatus,
      taskId: task.id,
      visibility,
    },
    organizationId: project.organization_id,
    projectId: project.id,
    title: "Feladat létrehozva",
  });
  const { data: organization } = await adminSupabase.from("organizations").select("name, company_name").eq("id", project.organization_id).maybeSingle();
  await notifyTaskCreated({
    actor: {
      email: access.user.email,
      id: access.user.id,
      name: (access.user.user_metadata?.full_name as string | undefined) ?? (access.user.user_metadata?.name as string | undefined) ?? null,
      role: access.role,
    },
    adminSupabase,
    assigneeUserId,
    customerName: organization?.company_name ?? organization?.name ?? null,
    description,
    dueDate: dueDate || null,
    priority,
    projectName: project.name,
    status: initialStatus,
    taskId: task.id,
    title,
  });
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/notifications");
  return { success: "Feladat létrehozva." };
}

export async function updateTaskStatus(formData: FormData) {
  const taskId = text(formData.get("taskId"));
  const status = parseStatus(text(formData.get("status")));
  if (!taskId || !status) return;

  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) return;
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return;

  const { data: currentTask } = await adminSupabase.from("tasks").select("status, visibility").eq("id", taskId).is("deleted_at", null).maybeSingle();
  if (!currentTask || (currentTask.visibility === "superadmin_only" && access.role !== "superadmin")) return;

  const now = new Date().toISOString();
  const { data: task, error } = await adminSupabase.from("tasks").update({
    completed_at: status === "done" ? now : null,
    status,
  }).eq("id", taskId).is("deleted_at", null).select("id, organization_id, project_id, title").maybeSingle();

  if (error || !task) {
    console.error("Task status update failed", error);
    return;
  }
  await logAdminActivity({
    actorUserId: access.user.id,
    description: task.title,
    eventType: "task_status_updated",
    metadata: { fromStatus: currentTask.status, status, taskId: task.id, toStatus: status },
    organizationId: task.organization_id,
    projectId: task.project_id,
    title: "Feladat státusza módosítva",
  });
  revalidatePath("/admin/tasks");
}

export async function moveTask(taskId: string, requestedStatus: string): Promise<TaskActionState> {
  const status = parseStatus(requestedStatus);
  if (!taskId || !status || status === "archived") return { error: "Érvénytelen feladat vagy céloszlop." };

  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) return { error: "A művelethez admin jogosultság szükséges." };
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase szerveroldali kulcs." };

  const { data: currentTask } = await adminSupabase.from("tasks").select("status, visibility").eq("id", taskId).is("deleted_at", null).maybeSingle();
  if (!currentTask || (currentTask.visibility === "superadmin_only" && access.role !== "superadmin")) {
    return { error: "A feladat nem található vagy nincs hozzá jogosultságod." };
  }

  const { data: task, error } = await adminSupabase.from("tasks").update({
    completed_at: status === "done" ? new Date().toISOString() : null,
    status,
  }).eq("id", taskId).is("deleted_at", null).select("id, organization_id, project_id, title").maybeSingle();

  if (error || !task) {
    console.error("Task drag and drop failed", error);
    return { error: "Nem sikerült áthelyezni a feladatot." };
  }

  await logAdminActivity({
    actorUserId: access.user.id,
    description: task.title,
    eventType: "task_status_updated",
    metadata: { fromStatus: currentTask.status, source: "kanban_drag", status, taskId: task.id, toStatus: status },
    organizationId: task.organization_id,
    projectId: task.project_id,
    title: "Feladat áthelyezve a Kanban táblán",
  });
  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${task.id}`);
  return { success: "A feladat áthelyezve." };
}

export async function updateTask(_previousState: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const taskId = text(formData.get("taskId"));
  const projectId = text(formData.get("projectId"));
  const title = text(formData.get("title"));
  const description = text(formData.get("description"));
  const status = parseStatus(text(formData.get("status")));
  const priority = parsePriority(text(formData.get("priority")));
  const visibility = parseVisibility(text(formData.get("visibility")));
  const dueDate = text(formData.get("dueDate"));
  const startDate = text(formData.get("startDate"));

  if (!taskId || !projectId || !title || !status || !priority) return { error: "A projekt, a cím, a státusz és a prioritás kötelező." };
  if (title.length > 300) return { error: "A feladat címe legfeljebb 300 karakter lehet." };
  if (description.length > 10000) return { error: "A leírás legfeljebb 10 000 karakter lehet." };
  if (!visibility) return { error: "Érvénytelen láthatóság." };
  const dateError = parseDateRange(startDate, dueDate);
  if (dateError) return { error: dateError };

  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) return { error: "A művelethez admin jogosultság szükséges." };
  if (visibility === "superadmin_only" && access.role !== "superadmin") return { error: "Ezt a láthatóságot csak szuperadmin választhatja." };
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase szerveroldali kulcs." };

  const [{ data: currentTask }, { data: project }] = await Promise.all([
    adminSupabase.from("tasks").select("id, organization_id, project_id, source_ticket_id, title, description, status, priority, visibility, due_at, start_date").eq("id", taskId).is("deleted_at", null).maybeSingle(),
    adminSupabase.from("projects").select("id, organization_id, name").eq("id", projectId).is("deleted_at", null).maybeSingle(),
  ]);
  if (!currentTask) return { error: "A feladat nem található." };
  if (currentTask.visibility === "superadmin_only" && access.role !== "superadmin") return { error: "A feladat nem található vagy nincs hozzá jogosultságod." };
  if (!project) return { error: "A kiválasztott projekt nem található." };
  if (currentTask.source_ticket_id && currentTask.organization_id !== project.organization_id) {
    return { error: "Ticketből készült feladat csak ugyanazon ügyfél projektjei között mozgatható." };
  }

  const nextDueAt = dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null;
  const { data: task, error } = await adminSupabase.from("tasks").update({
    completed_at: status === "done" ? new Date().toISOString() : null,
    description,
    due_at: nextDueAt,
    organization_id: project.organization_id,
    priority,
    project_id: project.id,
    start_date: startDate || null,
    status,
    title,
    visibility,
  }).eq("id", taskId).is("deleted_at", null).select("id, organization_id, project_id, title").maybeSingle();

  if (error || !task) {
    console.error("Task update failed", error);
    return { error: "Nem sikerült menteni a feladatot." };
  }

  const changes: Record<string, { from: string | null; to: string | null }> = {};
  if (currentTask.project_id !== project.id) changes.projectId = { from: currentTask.project_id, to: project.id };
  if (currentTask.title !== title) changes.title = { from: currentTask.title, to: title };
  if (currentTask.description !== description) changes.description = { from: currentTask.description, to: description };
  if (currentTask.status !== status) changes.status = { from: currentTask.status, to: status };
  if (currentTask.priority !== priority) changes.priority = { from: currentTask.priority, to: priority };
  if (currentTask.visibility !== visibility) changes.visibility = { from: currentTask.visibility, to: visibility };
  if (currentTask.due_at !== nextDueAt) changes.dueAt = { from: currentTask.due_at, to: nextDueAt };
  if ((currentTask.start_date ?? null) !== (startDate || null)) changes.startDate = { from: currentTask.start_date ?? null, to: startDate || null };

  await logAdminActivity({
    actorUserId: access.user.id,
    description: task.title,
    eventType: "task_updated",
    metadata: { changes, priority, status, taskId: task.id, visibility },
    organizationId: task.organization_id,
    projectId: task.project_id,
    title: "Feladat módosítva",
  });
  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${task.id}`);
  return { success: "A feladat módosításai elmentve." };
}

export async function deleteTask(_previousState: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const taskId = text(formData.get("taskId"));
  if (!taskId) return { error: "Hiányzik a feladat azonosítója." };

  const access = await getCurrentAdminAccess();
  if (!access.user) return { error: "A törléshez újra be kell jelentkezned." };
  if (access.role !== "superadmin") return { error: "Feladatot csak superadmin törölhet." };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase szerveroldali kulcs." };

  const { data: currentTask, error: taskLookupError } = await adminSupabase
    .from("tasks")
    .select("id, organization_id, project_id, title, status, priority, visibility")
    .eq("id", taskId)
    .is("deleted_at", null)
    .maybeSingle();

  if (taskLookupError || !currentTask) return { error: "A feladat nem található vagy már törölve lett." };

  const deletedAt = new Date().toISOString();
  const { data: deletedTask, error: deleteError } = await adminSupabase
    .from("tasks")
    .update({ deleted_at: deletedAt })
    .eq("id", currentTask.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (deleteError || !deletedTask) {
    console.error("Task soft delete failed", deleteError);
    return { error: "Nem sikerült törölni a feladatot." };
  }

  const { error: commentsDeleteError } = await adminSupabase
    .from("task_comments")
    .update({ deleted_at: deletedAt })
    .eq("task_id", currentTask.id)
    .is("deleted_at", null);

  if (commentsDeleteError) console.error("Task comments soft delete failed", commentsDeleteError);

  await logAdminActivity({
    actorUserId: access.user.id,
    description: currentTask.title,
    eventType: "task_deleted",
    metadata: {
      deletedAt,
      priority: currentTask.priority,
      status: currentTask.status,
      taskId: currentTask.id,
      visibility: currentTask.visibility,
    },
    organizationId: currentTask.organization_id,
    projectId: currentTask.project_id,
    title: "Feladat törölve",
  });

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${currentTask.id}`);
  revalidatePath("/portal/tasks");
  redirect("/admin/tasks");
}

export async function createTaskFromTicket(_previousState: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const ticketId = text(formData.get("ticketId"));
  if (!ticketId) return { error: "Hiányzik a ticket azonosítója." };

  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) return { error: "A művelethez admin jogosultság szükséges." };
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase szerveroldali kulcs." };

  const { data: existingTask } = await adminSupabase.from("tasks").select("id").eq("source_ticket_id", ticketId).is("deleted_at", null).maybeSingle();
  if (existingTask) return { error: "Ebből a ticketből már készült feladat." };

  const { data: ticket } = await adminSupabase.from("support_tickets")
    .select("id, organization_id, project_id, subject, priority")
    .eq("id", ticketId).is("deleted_at", null).maybeSingle();
  if (!ticket) return { error: "A ticket nem található." };
  if (!ticket.project_id) return { error: "A tickethez előbb projektet kell rendelni." };

  const [{ data: firstMessage }, { data: project }, { data: organization }] = await Promise.all([
    adminSupabase.from("support_ticket_messages").select("message").eq("ticket_id", ticket.id).is("deleted_at", null).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    adminSupabase.from("projects").select("name").eq("id", ticket.project_id).maybeSingle(),
    adminSupabase.from("organizations").select("name, company_name").eq("id", ticket.organization_id).maybeSingle(),
  ]);

  const { data: task, error } = await adminSupabase.from("tasks").insert({
    created_by: access.user.id,
    description: firstMessage?.message ?? "",
    organization_id: ticket.organization_id,
    priority: ticket.priority,
    project_id: ticket.project_id,
    source_ticket_id: ticket.id,
    status: "todo",
    title: ticket.subject,
    visibility: "client_visible",
  }).select("id").single();
  if (error || !task) {
    console.error("Ticket to task conversion failed", error);
    return { error: "Nem sikerült feladatot készíteni a ticketből. Ellenőrizd a migrációt." };
  }

  await adminSupabase.from("support_tickets").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", ticket.id);
  await logAdminActivity({
    actorUserId: access.user.id,
    description: ticket.subject,
    eventType: "support_ticket_converted_to_task",
    metadata: { source: "ticket", status: "todo", taskId: task.id, ticketId: ticket.id },
    organizationId: ticket.organization_id,
    projectId: ticket.project_id,
    title: "Ticketből feladat készült",
  });
  await notifyTaskCreated({
    actor: {
      email: access.user.email,
      id: access.user.id,
      name: (access.user.user_metadata?.full_name as string | undefined) ?? (access.user.user_metadata?.name as string | undefined) ?? null,
      role: access.role,
    },
    adminSupabase,
    customerName: organization?.company_name ?? organization?.name ?? null,
    description: firstMessage?.message ?? "",
    priority: ticket.priority,
    projectName: project?.name ?? "Ismeretlen projekt",
    status: "backlog",
    taskId: task.id,
    title: ticket.subject,
  });
  revalidatePath("/admin/messages");
  revalidatePath("/admin/tasks");
  revalidatePath("/portal/support");
  return { success: "A ticketből elkészült a feladat." };
}
