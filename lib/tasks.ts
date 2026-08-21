import type { AdminProjectListItem } from "@/lib/admin-data";
import type { Project } from "@/lib/project-types";

export type TaskItem = {
  title: string;
  detail: string;
  href: string;
  tone: "warning" | "danger" | "info";
};

export function getPortalTasks(projects: Project[]): TaskItem[] {
  return projects.flatMap((project) => {
    const tasks: TaskItem[] = [];

    if (project.status === "draft") {
      tasks.push({
        title: "Projekt ellenőrzésre küldhető",
        detail: project.name,
        href: `/portal/agents/${project.id}?tab=project-settings`,
        tone: "info",
      });
    }

    if (project.documents === 0 && !project.knowledgeAssetsReceived) {
      tasks.push({
        title: "Tudásbázis hiányzik",
        detail: project.name,
        href: `/portal/agents/${project.id}?tab=documents`,
        tone: "warning",
      });
    }

    if (project.category === "voice_agent" && project.googleAccessRequired && !project.googleAccountEmail) {
      tasks.push({
        title: "Google hozzáférés később megadható",
        detail: project.name,
        href: `/portal/agents/${project.id}?tab=project-settings`,
        tone: "warning",
      });
    }

    return tasks;
  });
}

export function getAdminTasks(projects: AdminProjectListItem[]): TaskItem[] {
  return projects.flatMap((project) => {
    const tasks: TaskItem[] = [];
    const detail = `${project.customerName} · ${project.name}`;
    const baseHref = `/admin/projects/${project.id}?from=tasks`;
    const isVoiceAgent = project.category === "voice_agent";
    const needsPhoneDocuments = project.phoneRequestType === "local_company" || project.phoneRequestType === "local_private";
    const agentConfigured = Boolean(
      project.promptAssetsReceived ||
      (project.agentDisplayName && project.agentDisplayName !== "Nincs megadva" && project.greeting && project.callInstructions),
    );
    const knowledgeReady = project.knowledgeAssetsReceived || (project.documents > 0 && project.documentsReady === project.documents);

    if (project.status === "review_requested") {
      tasks.push({
        title: "Ügyfél ellenőrzést kért",
        detail,
        href: `${baseHref}&tab=project-settings`,
        tone: "info",
      });
    }

    if (isVoiceAgent && !project.phoneRequestType && !project.phoneNumber) {
      tasks.push({
        title: "Telefonszám igény hiányzik",
        detail,
        href: `${baseHref}&tab=phone`,
        tone: "danger",
      });
    }

    if (isVoiceAgent && project.phoneRequestType && !project.phoneNumber) {
      tasks.push({
        title: "Telefonszám létrehozása szükséges",
        detail,
        href: `${baseHref}&tab=phone`,
        tone: "warning",
      });
    }

    if (needsPhoneDocuments && !project.phoneDocumentsReceived) {
      tasks.push({
        title: "Telefonszám dokumentumok hiányoznak",
        detail,
        href: `${baseHref}&tab=phone`,
        tone: "danger",
      });
    }

    if (isVoiceAgent && project.googleAccessRequired && project.googleAccessStatus !== "working") {
      tasks.push({
        title: "Google hozzáférés nincs rendben",
        detail,
        href: `${baseHref}&tab=google-access`,
        tone: project.googleAccessStatus === "submitted" || project.googleAccessStatus === "checking" ? "warning" : "danger",
      });
    }

    if (!knowledgeReady) {
      tasks.push({
        title: "Tudásbázis ellenőrzése szükséges",
        detail,
        href: `${baseHref}&tab=documents`,
        tone: project.documents > 0 ? "warning" : "danger",
      });
    }

    if (isVoiceAgent && !agentConfigured) {
      tasks.push({
        title: "Agent beállítások hiányosak",
        detail,
        href: `${baseHref}&tab=setup`,
        tone: "warning",
      });
    }

    if (project.telnyxStatus === "failed") {
      tasks.push({
        title: "Telnyx kapcsolat hibás",
        detail,
        href: `${baseHref}&tab=phone`,
        tone: "danger",
      });
    }

    return tasks;
  });
}
