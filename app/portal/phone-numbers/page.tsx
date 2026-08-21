import { ArrowRight, FolderKanban, Phone } from "lucide-react";
import Link from "next/link";
import { getProjects } from "@/lib/data";

export default async function PortalPhoneNumbersPage() {
  const projects = await getProjects();
  const phoneProjects = projects.filter((project) => project.phoneNumber);

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Telefonszámok</p>
          <h1>Telefonszámok</h1>
          <p className="intro-copy">A létrehozott telefonszámok és a hozzájuk tartozó projektek áttekintése.</p>
        </div>
      </div>

      <div className="section-heading">
        <h2>Létrehozott számok</h2>
        <span>{phoneProjects.length} telefonszám</span>
      </div>

      {phoneProjects.length ? (
        <div className="project-list projects-page-list">
          {phoneProjects.map((project) => {
            return (
              <Link className="project-card phone-number-card" href={`/portal/agents/${project.id}`} key={project.id}>
                <div className="project-main">
                  <div className="project-title"><Phone size={16} /> {project.phoneNumber}</div>
                </div>
                <div className="project-detail-cell"><span className="detail-value"><FolderKanban size={14} />{project.name}</span></div>
                <div className={`status ${project.status === "live" ? "live" : "building"}`}><span className="status-dot" />{project.status === "live" ? "Aktív" : "Nem aktív"}</div>
                <div className="project-row-status"><ArrowRight className="arrow" size={18} /></div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">Még nincs létrehozott telefonszám.</div>
      )}
    </section>
  );
}
