import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProject, statusLabels } from "@/lib/data";
import { listElevenLabsConversations, listElevenLabsKnowledgeBaseDocuments } from "@/lib/elevenlabs";
import { getMetaLeadSources } from "@/lib/meta-leads";
import { getOnboardingAccounts } from "@/lib/onboarding-accounts-data";
import { getKnowledgeUrls } from "@/lib/knowledge-urls-data";
import { getOnboardingFieldConfig } from "@/lib/onboarding-config-data";
import { getRequiredOnboardingState } from "@/lib/project-onboarding";
import { getProjectSourceData } from "@/lib/project-source-data";
import { isDesignProject } from "@/lib/project-sources";
import { ProjectTabs } from "./project-tabs";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const completion = project.documents > 0 ? Math.round((project.documentsReady / project.documents) * 100) : 0;
  const isDeliveryProject = isDesignProject(project.category);
  if (!isDeliveryProject && project.status === "draft") {
    // Amíg a kötelező onboarding lépések nincsenek készen, az ügyfél nem léphet a projektre.
    const [{ accounts, available }, { assistantFields }, { urls }] = await Promise.all([getOnboardingAccounts(id), getOnboardingFieldConfig(id), getKnowledgeUrls(id)]);
    if (!getRequiredOnboardingState(project, !available || accounts.every((account) => account.done), assistantFields, urls.length).complete) redirect(`/portal/projects/${id}/onboarding`);
  }
  const [elevenLabsKnowledgeBase, conversations, metaLeadSources, projectSources, knowledgeUrls] = await Promise.all([
    isDeliveryProject ? Promise.resolve(undefined) : listElevenLabsKnowledgeBaseDocuments(project.elevenLabsAgentId),
    isDeliveryProject ? Promise.resolve(undefined) : listElevenLabsConversations(project.elevenLabsAgentId, project.id),
    project.category === "meta_lead_caller" ? getMetaLeadSources(project.id) : Promise.resolve(undefined),
    isDeliveryProject ? getProjectSourceData(project.id) : Promise.resolve(undefined),
    isDeliveryProject ? Promise.resolve(undefined) : getKnowledgeUrls(project.id),
  ]);

  return <section className="content"><Link className="back-link" href="/portal"><ArrowLeft size={15} /> Vissza a projektekhez</Link><div className="detail-header"><div><p className="eyebrow">Projekt részletei</p><h1>{project.name}</h1>{!isDeliveryProject && <p className="detail-subtitle">{project.agentDisplayName}</p>}</div><div className="detail-actions"><div className={`status status-badge-readonly ${project.status}`}><span className="status-dot" />{statusLabels[project.status]}</div></div></div><ProjectTabs knowledgeUrls={knowledgeUrls?.urls} project={project} completion={completion} elevenLabsKnowledgeBase={elevenLabsKnowledgeBase} conversations={conversations} metaLeadSources={metaLeadSources} projectSources={projectSources} /></section>;
}
