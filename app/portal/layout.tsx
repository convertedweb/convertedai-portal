import { Bell, LogOut, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import NavLinks from "@/app/portal/nav-links";
import { ThemeToggle } from "@/app/theme-toggle";
import { getPortalUserSummary, getProjects } from "@/lib/data";
import { getCurrentAdminAccess } from "@/lib/admin-permissions";
import { getPortalTasks } from "@/lib/tasks";

export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const adminAccess = await getCurrentAdminAccess();
  if (adminAccess.role) redirect("/admin");

  const [userSummary, projects] = await Promise.all([getPortalUserSummary(), getProjects()]);
  const tasks = getPortalTasks(projects);

  return (
    <div className="app-shell">
      <aside className="icon-rail" aria-label="Gyors műveletek">
        <div className="rail-logo"><Sparkles size={18} /></div>
        <div className="rail-bottom">
          <Link className="rail-button rail-notifications" aria-label={`Teendők: ${tasks.length} db`} title={`${tasks.length} teendő`} href="/portal/tasks">
            <Bell size={18} />
            {tasks.length > 0 && <span className="rail-badge">{tasks.length > 9 ? "9+" : tasks.length}</span>}
          </Link>
          <ThemeToggle />
          <Link className="rail-button" aria-label="Beállítások" title="Beállítások" href="/portal/settings"><Settings size={18} /></Link>
          <a className="rail-button" aria-label="Kijelentkezés" title="Kijelentkezés" href="/auth/signout?next=/portal"><LogOut size={18} /></a>
        </div>
      </aside>
      <aside className="sidebar">
        <div className="brand"><div className="brand-name">norpheus AI</div></div>
        <NavLinks />
        <div className="sidebar-bottom">
          <div className="user-row"><div className="avatar">{userSummary.initials}</div><div className="user-copy"><div className="user-name">{userSummary.name}</div><div className="user-email">{userSummary.email}</div></div></div>
        </div>
      </aside>
      <main className="main">
        {children}
      </main>
    </div>
  );
}
