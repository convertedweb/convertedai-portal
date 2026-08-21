import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTabs } from "@/app/portal/agents/[id]/project-tabs";
import { getAdminProject } from "@/lib/admin-data";
import { statusLabels } from "@/lib/data";
import { listElevenLabsConversations, listElevenLabsKnowledgeBaseDocuments } from "@/lib/elevenlabs";
import { ProjectAdminActions } from "./delete-project-button";

export default async function AdminProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params;
  const { from } = await searchParams;
  const { isAdmin, canManageProjects, customer, project, userEmail } = await getAdminProject(id);

  if (!isAdmin) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><Building2 size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Ehhez a projekthez külön admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!project || !customer) notFound();

  const completion = project.documents > 0 ? Math.round((project.documentsReady / project.documents) * 100) : 0;
  const elevenLabsKnowledgeBase = await listElevenLabsKnowledgeBaseDocuments(project.elevenLabsAgentId);
  const conversations = await listElevenLabsConversations(project.elevenLabsAgentId, project.id);
  const backHref = from === "tasks" ? "/admin/tasks" : from === "projects" ? "/admin/projects" : `/admin/customers/${customer.id}/edit`;
  const backLabel = from === "tasks" ? "Vissza a teendőkhöz" : from === "projects" ? "Vissza a projektekhez" : "Vissza az ügyfélhez";

  return (
    <section className="content">
      <Link className="back-link" href={backHref}>
        <ArrowLeft size={15} /> {backLabel}
      </Link>
      <div className="detail-header">
        <div>
          <p className="eyebrow">{customer.companyName}</p>
          <h1>{project.name}</h1>
          <p className="detail-subtitle">{project.agentDisplayName}</p>
        </div>
        <div className="detail-actions">
          <ProjectAdminActions canManageProjects={canManageProjects} customerId={customer.id} projectId={project.id} projectName={project.name} source={from ?? ""} status={project.status} />
        </div>
      </div>

      <ProjectTabs adminSettings={{ canManageProjects, customerId: customer.id, source: from ?? "" }} project={project} completion={completion} elevenLabsKnowledgeBase={elevenLabsKnowledgeBase} conversations={conversations} />
    </section>
  );
}
