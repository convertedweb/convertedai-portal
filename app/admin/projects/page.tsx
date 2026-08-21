import { CirclePause } from "lucide-react";
import Link from "next/link";
import { getAdminProjects } from "@/lib/admin-data";
import { canViewProjects, getAdminRoleLabel } from "@/lib/admin-permissions";
import { AdminProjectsTable } from "./admin-projects-table";

export default async function AdminProjectsPage() {
  const { adminPermissions, adminRole, isAdmin, projects, userEmail } = await getAdminProjects();
  const roleLabel = getAdminRoleLabel(adminRole);
  const activeProjects = projects.filter((project) => project.status === "live").length;
  const archivedProjects = projects.filter((project) => project.status === "archived").length;

  if (!isAdmin) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Ehhez a felülethez külön admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin/projects">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin/projects">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!canViewProjects(adminRole, adminPermissions)) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs projekt hozzáférés</h1>
          <p>A projektek megtekintéséhez külön Admin jogosultság szükséges.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/admin">Vissza az ügyfelekhez</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">{roleLabel}</p>
          <h1>Projektek</h1>
          <p className="intro-copy">Az összes ügyfélhez tartozó voice agent és automatizációs projekt egy helyen.</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-label">Összes projekt</div><div className="stat-value">{projects.length}</div></div>
        <div className="stat"><div className="stat-label">Aktív projekt</div><div className="stat-value">{activeProjects}</div></div>
        <div className="stat"><div className="stat-label">Archivált projekt</div><div className="stat-value">{archivedProjects}</div></div>
      </div>

      <AdminProjectsTable projects={projects} />
    </section>
  );
}
