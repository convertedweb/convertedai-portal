import { ArrowRight, Bell, CheckCircle2, CirclePause } from "lucide-react";
import Link from "next/link";
import { getAdminProjects } from "@/lib/admin-data";
import { getAdminRoleLabel } from "@/lib/admin-permissions";
import { getAdminTasks } from "@/lib/tasks";

export default async function AdminTasksPage() {
  const { adminRole, isAdmin, projects, userEmail } = await getAdminProjects();
  const roleLabel = getAdminRoleLabel(adminRole);
  const tasks = isAdmin ? getAdminTasks(projects) : [];

  if (!isAdmin) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Ehhez a felülethez külön admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin/tasks">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin/tasks">Másik fiókkal belépek</Link>
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
          <h1>Teendők</h1>
          <p className="intro-copy">Az összes ügyfélprojektből összegyűjtött admin teendők egy helyen.</p>
        </div>
        <div className="projects-count">{tasks.length} teendő</div>
      </div>

      {tasks.length ? (
        <div className="task-list">
          {tasks.map((task, index) => (
            <Link className={`task-card ${task.tone}`} href={task.href} key={`${task.href}-${index}`}>
              <div className="task-icon"><Bell size={18} /></div>
              <div>
                <strong>{task.title}</strong>
                <span>{task.detail}</span>
              </div>
              <ArrowRight className="arrow" size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <CheckCircle2 size={24} />
          <div>
            <strong>Nincs aktuális teendő.</strong>
            <p>Minden admin oldali ellenőrzési pont rendben van.</p>
          </div>
        </div>
      )}
    </section>
  );
}
