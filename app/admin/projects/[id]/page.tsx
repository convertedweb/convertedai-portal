import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTabs } from "@/app/portal/agents/[id]/project-tabs";
import { getAdminProject } from "@/lib/admin-data";
import { statusLabels } from "@/lib/data";
import { listElevenLabsConversations, listElevenLabsKnowledgeBaseDocuments } from "@/lib/elevenlabs";
import { getMetaLeadSources } from "@/lib/meta-leads";
import { getProjectSourceData } from "@/lib/project-source-data";
import { isDesignProject } from "@/lib/project-sources";
import { getOnboardingAccounts } from "@/lib/onboarding-accounts-data";
import { getKnowledgeUrls } from "@/lib/knowledge-urls-data";
import { getOnboardingFieldConfig } from "@/lib/onboarding-config-data";
import { OnboardingAccountsForm } from "./onboarding-accounts-form";
import { OnboardingOverview } from "./onboarding-overview";
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
  const isDeliveryProject = isDesignProject(project.category);
  const [elevenLabsKnowledgeBase, conversations, metaLeadSources, projectSources, knowledgeUrls] = await Promise.all([
    isDeliveryProject ? Promise.resolve(undefined) : listElevenLabsKnowledgeBaseDocuments(project.elevenLabsAgentId),
    isDeliveryProject ? Promise.resolve(undefined) : listElevenLabsConversations(project.elevenLabsAgentId, project.id),
    project.category === "meta_lead_caller" ? getMetaLeadSources(project.id) : Promise.resolve(undefined),
    isDeliveryProject ? getProjectSourceData(project.id) : Promise.resolve(undefined),
    isDeliveryProject ? Promise.resolve(undefined) : getKnowledgeUrls(project.id),
  ]);
  // Az onboarding áttekintő minden adminnak (csak olvasható); a szerkesztő fiókpanel csak a superadminnak.
  const [onboardingAccounts, fieldConfig] = !isDeliveryProject ? await Promise.all([getOnboardingAccounts(project.id), getOnboardingFieldConfig(project.id)]) : [null, null];
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
          {!isDeliveryProject && <p className="detail-subtitle">{project.agentDisplayName}</p>}
        </div>
        <div className="detail-actions">
          <ProjectAdminActions canManageProjects={canManageProjects} customerId={customer.id} projectId={project.id} projectName={project.name} source={from ?? ""} status={project.status} />
        </div>
      </div>

      <ProjectTabs knowledgeUrls={knowledgeUrls?.urls} onboardingPanel={onboardingAccounts && fieldConfig && knowledgeUrls ? <OnboardingOverview accounts={onboardingAccounts.accounts} accountsAvailable={onboardingAccounts.available} assistantFields={fieldConfig.assistantFields} canSeeSecrets={canManageProjects} knowledgeUrls={knowledgeUrls.urls} project={project} /> : undefined} accountsPanel={canManageProjects && onboardingAccounts && fieldConfig ? <OnboardingAccountsForm customerId={customer.id} details={onboardingAccounts.allDetails} doneKeys={onboardingAccounts.doneKeys} projectId={project.id} selectedKeys={onboardingAccounts.selectedKeys} /> : undefined} onboardingFieldKeys={fieldConfig?.assistantFields} adminSettings={{ canManageProjects, customerId: customer.id, source: from ?? "" }} project={project} completion={completion} elevenLabsKnowledgeBase={elevenLabsKnowledgeBase} conversations={conversations} metaLeadSources={metaLeadSources} projectSources={projectSources} />
    </section>
  );
}
