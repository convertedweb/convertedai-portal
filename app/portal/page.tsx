import { ArrowRight, FileText, FolderKanban, Phone } from "lucide-react";
import Link from "next/link";
import { projects, statusLabels } from "@/lib/data";

export default function PortalPage() {
  const liveCount = projects.filter((project) => project.status === "live").length;
  const readyFiles = projects.reduce((sum, project) => sum + project.documentsReady, 0);
  const allFiles = projects.reduce((sum, project) => sum + project.documents, 0);

  return <section className="content">
    <div className="page-intro"><div><p className="eyebrow">Ügyfélportál</p><h1>Jó napot, Norbert!</h1><p className="intro-copy">Itt követheti a projektjei állapotát, a feltöltött dokumentumokat és a telefonos asszisztens beállításait.</p></div><button className="button" disabled title="Hamarosan elérhető">Új projekt <ArrowRight size={15} /></button></div>
    <div className="stats"><div className="stat"><div className="stat-label">Összes projekt</div><div className="stat-value">{projects.length}</div></div><div className="stat"><div className="stat-label">Aktív asszisztens</div><div className="stat-value">{liveCount}</div></div><div className="stat"><div className="stat-label">Feldolgozott dokumentum</div><div className="stat-value">{readyFiles}<span style={{color:"#9aa7ab", fontSize:16}}> / {allFiles}</span></div></div></div>
    <div className="section-heading"><h2>Projektek</h2><span>{projects.length} projekt</span></div>
    <div className="project-list">{projects.map((project) => <Link className="project-card" href={`/portal/agents/${project.id}`} key={project.id}><div><div className="project-title">{project.name}</div><div className="project-agent">{project.agentDisplayName}</div></div><div className="project-meta"><span><Phone size={14} />{project.phoneNumber ?? "Telefonszám még nincs"}</span><span><FileText size={14} />{project.documents} dokumentum</span></div><div className={`status ${project.status}`}><span className="status-dot" />{statusLabels[project.status]} <ArrowRight className="arrow" size={16} /></div></Link>)}</div>
  </section>;
}
