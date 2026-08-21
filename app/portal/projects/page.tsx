import { ArrowRight, CalendarClock, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { categoryLabels, getProjects, statusLabels } from "@/lib/data";

export default async function ProjectsPage() {
  const allProjects = await getProjects();
  const projects = allProjects.filter((project) => project.category === "voice_agent");
  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Voice agentek</p>
          <h1>Voice agentek</h1>
          <p className="intro-copy">Tekintse át a telefonos asszisztenseit, és nyissa meg a hozzájuk tartozó dokumentumokat, státuszokat és aktivitást.</p>
        </div>
        <Link className="button" href="/portal/projects/new?category=voice_agent"><Plus size={15} /> Új voice agent</Link>
      </div>

      <div className="projects-toolbar">
        <div className="projects-count">Összes voice agent <strong>{projects.length}</strong></div>
        <div className="project-filters"><button className="filter-button active">Mind</button><button className="filter-button">Aktív</button><button className="filter-button">Beállítás alatt</button></div>
      </div>

      <div className="project-list projects-page-list">
        {projects.map((project) => (
          <Link className="project-card project-card-detailed" href={`/portal/agents/${project.id}`} key={project.id}>
            <div className="project-main"><div className="project-title">{project.name}</div><div className="project-agent">{categoryLabels[project.category]} · {project.agentDisplayName}</div></div>
            <div className="project-detail-cell"><span className="detail-value"><Phone size={14} />{project.phoneNumber ?? "Telefonszám még nincs"}</span></div>
            <div className="project-detail-cell"><span className="detail-value"><CalendarClock size={14} />{project.createdAt}</span></div>
            <div className="project-row-status"><div className={`status ${project.status}`}><span className="status-dot" />{statusLabels[project.status]}</div><ArrowRight className="arrow" size={18} /></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
