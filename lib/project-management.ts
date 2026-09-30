import { getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const taskStatuses = ["backlog", "planned", "todo", "in_progress", "waiting_client", "review", "done"] as const;
export type TaskStatus = (typeof taskStatuses)[number] | "archived";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export const taskStatusLabels: Record<TaskStatus, string> = {
  backlog: "Ötletek",
  todo: "Tennivaló",
  planned: "Tervezve",
  in_progress: "Folyamatban",
  waiting_client: "Ügyfélre vár",
  review: "Ellenőrzés",
  done: "Kész",
  archived: "Archivált",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: "Alacsony",
  normal: "Normál",
  high: "Magas",
  urgent: "Sürgős",
};

type TaskRow = {
  id: string;
  project_id: string;
  source_ticket_id: string | null;
  assignee_user_id: string | null;
  created_by: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  visibility: "internal" | "client_visible" | "superadmin_only";
  due_at: string | null;
  start_date: string | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  project_type: "voice_agent" | "website" | "cro" | "automation" | "internal" | "other";
  visibility: "internal" | "client";
};

type OrganizationRow = { id: string; name: string; company_name: string | null; superadmin_only: boolean };

export type ProjectManagementProject = ProjectRow & { customerName: string };
export type ProjectManagementTask = TaskRow & { customerName: string; organizationId: string; projectName: string };
export type AssignableAdminUser = { email: string; id: string; name: string; role: "superadmin" | "admin" };
export type TaskActivityItem = {
  actorName: string;
  createdAt: string;
  description: string | null;
  eventType: string;
  id: string;
  metadata: Record<string, unknown>;
  title: string;
};

export function getNotificationTaskFingerprint(title: string, description: string) {
  return `${title}\u0000${description}`;
}

function getAssignableUserName(user: { email?: string; user_metadata?: { full_name?: string; name?: string } }) {
  return user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Nincs név";
}

export async function getAssignableAdminUsers(): Promise<AssignableAdminUser[]> {
  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) return [];

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return [];

  const [{ data: adminRoles }, { data: superadmins }, { data: usersData }] = await Promise.all([
    adminSupabase.from("admin_roles").select("user_id, role"),
    adminSupabase.from("super_admins").select("user_id"),
    adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const authUsers = new Map((usersData?.users ?? []).map((user) => [user.id, user]));
  const roles = new Map<string, "superadmin" | "admin">();

  for (const row of adminRoles ?? []) roles.set(row.user_id, row.role === "superadmin" ? "superadmin" : "admin");
  for (const row of superadmins ?? []) roles.set(row.user_id, "superadmin");

  return Array.from(roles, ([id, role]) => {
    const user = authUsers.get(id);
    return {
      email: user?.email ?? "Nincs e-mail",
      id,
      name: user ? getAssignableUserName(user) : "Nincs név",
      role,
    };
  }).sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name, "hu"));
}

export async function getTaskActivity(taskId: string): Promise<TaskActivityItem[]> {
  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) return [];

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return [];

  const { data: task } = await adminSupabase
    .from("tasks")
    .select("id, title, visibility, created_at, created_by, source_ticket_id")
    .eq("id", taskId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!task || (task.visibility === "superadmin_only" && access.role !== "superadmin")) return [];

  const [{ data: logs, error }, { data: usersData }] = await Promise.all([
    adminSupabase
      .from("activity_logs")
      .select("id, actor_user_id, event_type, title, description, metadata, created_at")
      .eq("metadata->>taskId", taskId)
      .order("created_at", { ascending: false })
      .limit(100),
    adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (error) {
    console.error("Task activity lookup failed", error);
    return [];
  }

  const users = new Map((usersData?.users ?? []).map((user) => [user.id, getAssignableUserName(user)]));
  const activities: TaskActivityItem[] = (logs ?? []).map((log) => ({
    actorName: log.actor_user_id ? users.get(log.actor_user_id) ?? "Ismeretlen felhasználó" : "Rendszer",
    createdAt: log.created_at,
    description: log.description,
    eventType: log.event_type,
    id: log.id,
    metadata: (log.metadata ?? {}) as Record<string, unknown>,
    title: log.title,
  }));

  const hasCreationEvent = activities.some((activity) => activity.eventType === "task_created" || activity.eventType === "support_ticket_converted_to_task");
  if (!hasCreationEvent) {
    activities.push({
      actorName: task.created_by ? users.get(task.created_by) ?? "Ismeretlen felhasználó" : "Rendszer",
      createdAt: task.created_at,
      description: task.title,
      eventType: "task_created",
      id: `created-${task.id}`,
      metadata: { source: task.source_ticket_id ? "ticket" : "manual", taskId: task.id },
      title: task.source_ticket_id ? "Ticketből létrehozva" : "Feladat létrehozva",
    });
  }

  return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getNotificationTaskMarkers(): Promise<{
  fingerprints: Set<string>;
  keys: Set<string>;
}> {
  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) return { fingerprints: new Set(), keys: new Set() };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { fingerprints: new Set(), keys: new Set() };

  const [activityResult, tasksResult] = await Promise.all([
    adminSupabase
      .from("activity_logs")
      .select("metadata")
      .eq("event_type", "task_created"),
    adminSupabase
      .from("tasks")
      .select("title, description")
      .like("description", "Értesítésből létrehozva:%")
      .is("deleted_at", null),
  ]);

  if (activityResult.error || tasksResult.error) {
    console.error("Created notification lookup failed", activityResult.error ?? tasksResult.error);
    return { fingerprints: new Set(), keys: new Set() };
  }

  const keys = new Set(
    (activityResult.data ?? [])
      .map((row) => {
        const metadata = row.metadata as { notificationKey?: unknown } | null;
        return typeof metadata?.notificationKey === "string" ? metadata.notificationKey : null;
      })
      .filter((key): key is string => Boolean(key)),
  );

  return {
    fingerprints: new Set(
      (tasksResult.data ?? []).map((task) => getNotificationTaskFingerprint(task.title as string, task.description as string)),
    ),
    keys,
  };
}

export async function getProjectManagementData() {
  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) {
    return { access, projects: [] as ProjectManagementProject[], schemaReady: true, tasks: [] as ProjectManagementTask[] };
  }

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return { access, projects: [] as ProjectManagementProject[], schemaReady: false, tasks: [] as ProjectManagementTask[] };
  }

  const [tasksResult, projectsResult, organizationsResult] = await Promise.all([
    adminSupabase
      .from("tasks")
      .select("id, project_id, source_ticket_id, assignee_user_id, created_by, title, description, status, priority, visibility, due_at, start_date, created_at")
      .is("deleted_at", null)
      .neq("status", "archived")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    adminSupabase
      .from("projects")
      .select("id, organization_id, name, project_type, visibility")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    adminSupabase.from("organizations").select("id, name, company_name, superadmin_only").is("deleted_at", null),
  ]);

  if (tasksResult.error || projectsResult.error) {
    console.error("Project management schema is not ready", tasksResult.error ?? projectsResult.error);
    return { access, projects: [] as ProjectManagementProject[], schemaReady: false, tasks: [] as ProjectManagementTask[] };
  }

  const organizationRows = (organizationsResult.data ?? []) as OrganizationRow[];
  const visibleOrganizationRows = access.role === "superadmin" ? organizationRows : organizationRows.filter((organization) => !organization.superadmin_only);
  const organizations = new Map(visibleOrganizationRows.map((organization) => [organization.id, organization.company_name ?? organization.name]));
  const visibleOrganizationIds = new Set(visibleOrganizationRows.map((organization) => organization.id));
  const projects = ((projectsResult.data ?? []) as ProjectRow[]).filter((project) => visibleOrganizationIds.has(project.organization_id)).map((project) => ({
    ...project,
    customerName: organizations.get(project.organization_id) ?? "Belső projekt",
  }));
  const projectsById = new Map(projects.map((project) => [project.id, project]));

  const tasks = ((tasksResult.data ?? []) as TaskRow[]).filter((task) => projectsById.has(task.project_id)).map((task) => ({
    ...task,
    customerName: projectsById.get(task.project_id)?.customerName ?? "Ismeretlen ügyfél",
    organizationId: projectsById.get(task.project_id)?.organization_id ?? "",
    projectName: projectsById.get(task.project_id)?.name ?? "Ismeretlen projekt",
  }));

  return {
    access,
    projects,
    schemaReady: true,
    tasks: access.role === "superadmin" ? tasks : tasks.filter((task) => task.visibility !== "superadmin_only"),
  };
}
