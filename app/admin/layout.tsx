import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import AdminNavLinks from "@/app/admin/admin-nav-links";
import { DashboardHeader } from "@/app/dashboard-header";
import { ImpersonationBanner } from "@/app/impersonation-banner";
import { getAdminProjects } from "@/lib/admin-data";
import { getAdminSupportAlertCount } from "@/lib/support";
import { getAdminTasks } from "@/lib/tasks";
import { getActiveImpersonation } from "@/lib/impersonation";
import { getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { HeaderTimer } from "./header-timer";

export const metadata: Metadata = {
  title: "norpheus AI Admin",
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [{ adminPermissions, adminRole, isAdmin, projects, userEmail, userName }, impersonation] = await Promise.all([getAdminProjects(), getActiveImpersonation()]);
  const supportAlertCount = isAdmin ? await getAdminSupportAlertCount() : 0;
  const tasks = isAdmin ? getAdminTasks(projects) : [];
  const notificationCount = tasks.length + supportAlertCount;
  const runningTimer = isAdmin ? await getRunningTimer() : null;
  const initials = getInitials(userName);

  return (
    <div className="app-shell admin-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Sparkles size={18} /></div><div className="brand-name">Ügyfél Portál Admin</div></div>
        <AdminNavLinks adminPermissions={adminPermissions} canManagePermissions={adminRole === "superadmin"} />
        <div className="sidebar-bottom">
          <div className="user-row"><div className="avatar">{initials}</div><div className="user-copy"><div className="user-name">{userName}</div><div className="user-email">{userEmail ?? "admin felület"}</div></div></div>
        </div>
      </aside>
      <main className="main">
        <DashboardHeader label="Admin felület" notificationCount={notificationCount} notificationHref="/admin/notifications" signOutNext="/admin">{runningTimer && <HeaderTimer startedAt={runningTimer.startedAt} taskId={runningTimer.taskId} taskTitle={runningTimer.taskTitle} />}</DashboardHeader>
        {impersonation && <ImpersonationBanner actorEmail={impersonation.actorEmail} actorName={impersonation.actorName} />}
        {children}
      </main>
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

async function getRunningTimer() {
  const access = await getCurrentAdminAccess();
  const adminSupabase = createAdminClient();
  if (!access.user || !adminSupabase) return null;
  const { data } = await adminSupabase
    .from("task_time_entries")
    .select("task_id, started_at, tasks(title, deleted_at)")
    .eq("user_id", access.user.id)
    .is("ended_at", null)
    .maybeSingle();
  const task = Array.isArray(data?.tasks) ? data.tasks[0] : data?.tasks;
  if (!data || !task || task.deleted_at) return null;
  return { startedAt: data.started_at as string, taskId: data.task_id as string, taskTitle: task.title as string };
}
