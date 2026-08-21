import { ArrowRight, Bell, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getProjects } from "@/lib/data";
import { getPortalTasks } from "@/lib/tasks";

export default async function PortalTasksPage() {
  const projects = await getProjects();
  const tasks = getPortalTasks(projects);

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Teendők</p>
          <h1>Teendők</h1>
          <p className="intro-copy">Itt látod azokat a pontokat, amelyek a projekt előkészítéséhez vagy indításához még figyelmet kérnek.</p>
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
            <p>Minden ügyfél oldali előkészítési pont rendben van.</p>
          </div>
        </div>
      )}
    </section>
  );
}
