import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logCustomerActivity } from "@/lib/activity-log";
import { getProject } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingAccounts } from "@/lib/onboarding-accounts-data";
import { getKnowledgeUrls } from "@/lib/knowledge-urls-data";
import { getOnboardingFieldConfig } from "@/lib/onboarding-config-data";
import { isDesignProject } from "@/lib/project-sources";
import { OnboardingFlow } from "./onboarding-flow";

// Az emlékeztető e-mail linkjéről (?ref=reminder) érkező belépést naplózzuk; 12 órán belül egyszer.
async function logReminderVisit(projectId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: project } = await supabase.from("projects").select("organization_id").eq("id", projectId).is("deleted_at", null).single();
    if (!user || !project) return;
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase.from("activity_logs").select("id").eq("event_type", "email_visited").eq("project_id", projectId).eq("actor_user_id", user.id).gte("created_at", since).limit(1);
    if (recent?.length) return;
    await logCustomerActivity({ eventType: "email_visited", organizationId: project.organization_id, projectId, supabase, title: "Megnyitotta az emlékeztető e-mail linkjét" });
  } catch (error) {
    console.error("Reminder visit log failed", error);
  }
}

export default async function ProjectOnboardingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ref?: string }> }) {
  const [{ id }, { ref }] = await Promise.all([params, searchParams]);
  const project = await getProject(id);
  if (!project) notFound();
  if (isDesignProject(project.category)) redirect(`/portal/agents/${id}`);
  if (ref === "reminder") await logReminderVisit(id);
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
