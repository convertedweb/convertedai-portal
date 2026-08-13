import { ArrowRight, FileText, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { projects, statusLabels } from "@/lib/data";

export default function ProjectsPage() {
  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Projektkezelés</p>
          <h1>Projektek</h1>
          <p className="intro-copy">Tekintse át az összes ügyfélprojektet és nyissa meg a hozzájuk tartozó dokumentumokat, státuszokat és aktivitást.</p>
        </div>
        <button className="button" disabled title="Hamarosan elérhető"><Plus size={15} /> Új projekt</button>
      </div>

      <div className="projects-toolbar">
        <div className="projects-count">Összes projekt <strong>{projects.length}</strong></div>
        <div className="project-filters"><button className="filter-button active">Mind</button><button className="filter-button">Aktív</button><button className="filter-button">Beállítás alatt</button></div>
      </div>

      <div className="project-list projects-page-list">
        {projects.map((project) => (
          <Link className="project-card project-card-detailed" href={`/portal/agents/${project.id}`} key={project.id}>
            <div className="project-main"><div className="project-title">{project.name}</div><div className="project-agent">{project.agentDisplayName}</div><div className={`status ${project.status}`}><span className="status-dot" />{statusLabels[project.status]}</div></div>
            <div className="project-details"><div><span className="detail-label">Telefonszám</span><span className="detail-value"><Phone size={14} />{project.phoneNumber ?? "Még nincs hozzárendelve"}</span></div><div><span className="detail-label">Dokumentumok</span><span className="detail-value"><FileText size={14} />{project.documentsReady} / {project.documents} feldolgozva</span></div><div><span className="detail-label">Utolsó frissítés</span><span className="detail-value">{project.updatedAt}</span></div></div>
            <ArrowRight className="arrow" size={18} />
          </Link>
        ))}
      </div>
    </section>
  );
}
