import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProject } from "@/lib/data";
import { getOnboardingAccounts } from "@/lib/onboarding-accounts-data";
import { getKnowledgeUrls } from "@/lib/knowledge-urls-data";
import { getOnboardingFieldConfig } from "@/lib/onboarding-config-data";
import { isDesignProject } from "@/lib/project-sources";
import { OnboardingFlow } from "./onboarding-flow";

export default async function ProjectOnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  if (isDesignProject(project.category)) redirect(`/portal/agents/${id}`);
  const [{ accounts, available }, { assistantFields }, knowledgeUrls] = await Promise.all([getOnboardingAccounts(id), getOnboardingFieldConfig(id), getKnowledgeUrls(id)]);

  return (
    <section className="content">
      <Link className="back-link" href="/portal/projects"><ArrowLeft size={15} /> Vissza a projektekhez</Link>
      <div className="page-intro onboarding-intro">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>{project.name}</h1>
          <p className="intro-copy">Lépésről lépésre végigvezetünk azon, mit kell beállítanod vagy feltöltened. A lépések között szabadon válthatsz, de a beküldéshez mindegyiket ki kell töltened.</p>
        </div>
      </div>
      <OnboardingFlow accounts={accounts} accountsSavable={available} assistantFields={assistantFields} knowledgeUrls={knowledgeUrls.urls} knowledgeUrlsAvailable={knowledgeUrls.available} project={project} />
    </section>
  );
}
