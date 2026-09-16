import { Bell, LogOut, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import AdminNavLinks from "@/app/admin/admin-nav-links";
import { ThemeToggle } from "@/app/theme-toggle";
import { getAdminProjects } from "@/lib/admin-data";
import { getAdminSupportAlertCount } from "@/lib/support";
import { getAdminTasks } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "norpheus AI Admin",
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { adminPermissions, adminRole, isAdmin, projects, userEmail, userName } = await getAdminProjects();
  const supportAlertCount = isAdmin ? await getAdminSupportAlertCount() : 0;
  const tasks = isAdmin ? getAdminTasks(projects) : [];
  const notificationCount = tasks.length + supportAlertCount;
  const initials = getInitials(userName);

  return (
    <div className="app-shell admin-shell">
      <aside className="icon-rail" aria-label="Admin gyors műveletek">
        <div className="rail-logo"><Sparkles size={18} /></div>
        <div className="rail-bottom">
          <Link className="rail-button rail-notifications" aria-label={`Értesítések: ${notificationCount} db`} title={`${notificationCount} értesítés`} href="/admin/tasks">
            <Bell size={18} />
            {notificationCount > 0 && <span className="rail-badge">{notificationCount > 9 ? "9+" : notificationCount}</span>}
          </Link>
          <ThemeToggle />
          <a className="rail-button" aria-label="Kijelentkezés" title="Kijelentkezés" href="/auth/signout?next=/admin"><LogOut size={18} /></a>
        </div>
      </aside>
      <aside className="sidebar">
        <div className="brand"><div className="brand-name">norpheus AI Admin</div></div>
        <AdminNavLinks adminPermissions={adminPermissions} canManagePermissions={adminRole === "superadmin"} />
        <div className="sidebar-bottom">
          <div className="user-row"><div className="avatar">{initials}</div><div className="user-copy"><div className="user-name">{userName}</div><div className="user-email">{userEmail ?? "admin felület"}</div></div></div>
        </div>
      </aside>
      <main className="main">
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
