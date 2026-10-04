import { Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import NavLinks from "@/app/portal/nav-links";
import { DashboardHeader } from "@/app/dashboard-header";
import { ImpersonationBanner } from "@/app/impersonation-banner";
import { getPortalUserSummary, getProjects } from "@/lib/data";
import { getCurrentAdminAccess } from "@/lib/admin-permissions";
import { getPortalSupportAlertCount } from "@/lib/support";
import { getPortalTasks } from "@/lib/tasks";
import { getActiveImpersonation } from "@/lib/impersonation";

export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const adminAccess = await getCurrentAdminAccess();
  if (adminAccess.role) redirect("/admin");

  const [impersonation, userSummary, projects, supportAlertCount] = await Promise.all([getActiveImpersonation(), getPortalUserSummary(), getProjects(), getPortalSupportAlertCount()]);
  const tasks = getPortalTasks(projects);
  const notificationCount = tasks.length + supportAlertCount;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Sparkles size={18} /></div><div className="brand-name">Ügyfél Portál</div></div>
        <NavLinks />
        <div className="sidebar-bottom">
          <div className="user-row"><div className="avatar">{userSummary.initials}</div><div className="user-copy"><div className="user-name">{userSummary.name}</div><div className="user-email">{userSummary.email}</div></div></div>
        </div>
      </aside>
      <main className="main">
        <DashboardHeader label="Ügyfélportál" notificationCount={notificationCount} notificationHref="/portal/tasks" settingsHref="/portal/settings" signOutNext="/portal" />
        {impersonation && <ImpersonationBanner actorEmail={impersonation.actorEmail} actorName={impersonation.actorName} />}
        {children}
      </main>
    </div>
  );
}
