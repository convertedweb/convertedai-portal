import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, statusLabels } from "@/lib/data";
import { listElevenLabsConversations, listElevenLabsKnowledgeBaseDocuments } from "@/lib/elevenlabs";
import { ProjectTabs } from "./project-tabs";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const completion = project.documents > 0 ? Math.round((project.documentsReady / project.documents) * 100) : 0;
  const elevenLabsKnowledgeBase = await listElevenLabsKnowledgeBaseDocuments(project.elevenLabsAgentId);
  const conversations = await listElevenLabsConversations(project.elevenLabsAgentId, project.id);

  return <section className="content"><Link className="back-link" href="/portal"><ArrowLeft size={15} /> Vissza a projektekhez</Link><div className="detail-header"><div><p className="eyebrow">Projekt részletei</p><h1>{project.name}</h1><p className="detail-subtitle">{project.agentDisplayName}</p></div><div className="detail-actions"><div className={`status status-badge-readonly ${project.status}`}><span className="status-dot" />{statusLabels[project.status]}</div></div></div><ProjectTabs project={project} completion={completion} elevenLabsKnowledgeBase={elevenLabsKnowledgeBase} conversations={conversations} /></section>;
}
