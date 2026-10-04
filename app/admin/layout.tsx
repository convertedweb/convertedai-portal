import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import AdminNavLinks from "@/app/admin/admin-nav-links";
import { DashboardHeader } from "@/app/dashboard-header";
import { ImpersonationBanner } from "@/app/impersonation-banner";
import { getAdminProjects } from "@/lib/admin-data";
import { getAdminSupportAlertCount } from "@/lib/support";
import { getAdminTasks } from "@/lib/tasks";
import { getActiveImpersonation } from "@/lib/impersonation";

export const metadata: Metadata = {
  title: "norpheus AI Admin",
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [{ adminPermissions, adminRole, isAdmin, projects, userEmail, userName }, impersonation] = await Promise.all([getAdminProjects(), getActiveImpersonation()]);
  const supportAlertCount = isAdmin ? await getAdminSupportAlertCount() : 0;
  const tasks = isAdmin ? getAdminTasks(projects) : [];
  const notificationCount = tasks.length + supportAlertCount;
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
        <DashboardHeader label="Admin felület" notificationCount={notificationCount} notificationHref="/admin/notifications" signOutNext="/admin" />
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
