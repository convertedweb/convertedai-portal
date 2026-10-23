import { assistantFieldValue, defaultAssistantFieldKeys, type AssistantFieldKey } from "./onboarding-fields";
import { isPhoneStepComplete } from "./phone-documents";
import { isDesignProject } from "./project-sources";
import type { Project } from "./project-types";

export type OnboardingTarget = { tab: "documents" | "sources" | "project-settings" } | { href: string };

export type OnboardingTask = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  optional: boolean;
  target: OnboardingTarget;
};

const supportTarget: OnboardingTarget = { href: "/portal/support" };

// Az ügyfél teendői a már meglévő projektadatokból számolódnak, külön tárolt állapot nélkül.
export function getCustomerOnboardingTasks(project: Project, sourceLinkCount: number): OnboardingTask[] {
  const hasDocument = (matches: (category: string) => boolean) => project.documentList.some((document) => matches(document.category));
  const reviewTask: OnboardingTask = {
    id: "review",
    title: "Projekt ellenőrzésre küldése",
    description: "Ha a fenti lépések megvannak, küldd be a projektet; a csapat áttekinti és felveszi veled a kapcsolatot.",
    done: project.status !== "draft",
    optional: false,
    target: { tab: "project-settings" },
  };

  if (isDesignProject(project.category)) {
    return [
      {
        id: "brief",
        title: "Projekt brief és célok feltöltése",
        description: "Töltsd fel a projekt célját, célközönségét és elvárásait leíró dokumentumot.",
        done: hasDocument((category) => category === "design_source_brief"),
        optional: false,
        target: { tab: "sources" },
      },
      {
        id: "brand",
        title: "Arculat és logó feltöltése",
        description: "Logó, színek, betűtípusok vagy arculati kézikönyv, ha van.",
        done: hasDocument((category) => category === "design_source_brand"),
        optional: true,
        target: { tab: "sources" },
      },
      {
        id: "references",
        title: "Referenciák és linkek megadása",
        description: "Meglévő weboldal, Figma terv vagy tetszett példák linkjei, illetve képernyőképek.",
        done: sourceLinkCount > 0 || hasDocument((category) => category === "design_source_reference"),
        optional: true,
        target: { tab: "sources" },
      },
      reviewTask,
    ];
  }

  const tasks: OnboardingTask[] = [
    {
      id: "knowledge",
      title: "Tudásbázis anyagok feltöltése",
      description: "Árlista, GYIK, szolgáltatásleírás vagy bármi, amiből az asszisztensnek válaszolnia kell (PDF, DOCX, TXT, CSV).",
      done: project.knowledgeAssetsReceived || hasDocument((category) => category === "knowledge_base"),
      optional: false,
      target: { tab: "documents" },
    },
  ];

  if (project.phoneRequestType === "local_company" || project.phoneRequestType === "local_private") {
    tasks.push({
      id: "phone-documents",
      title: "Telefonszám igényléséhez szükséges dokumentumok",
      description: "A saját körzetes számhoz azonosító és cégdokumentumok kellenek. Küldd el e-mailben, vagy jelezd az Ügyfélszolgálaton.",
      done: project.phoneDocumentsReceived || hasDocument((category) => category.startsWith("phone_")),
      optional: false,
      target: supportTarget,
    });
  }

  tasks.push(reviewTask);
  return tasks;
}

// A beküldéshez és a projektoldal eléréséhez minden onboarding lépés kötelező
// accountsDone: a kiválasztott fiókok mind készek (vagy a fiókállapot nem menthető, ekkor nem blokkolunk).
export function getRequiredOnboardingState(project: Project, accountsDone: boolean, assistantFields: AssistantFieldKey[] = defaultAssistantFieldKeys, knowledgeUrlCount = 0) {
  const accounts = accountsDone;
  const assistant = assistantFields.every((key) => assistantFieldValue(project, key).trim().length > 0);
  const knowledge = project.knowledgeAssetsReceived || knowledgeUrlCount > 0 || project.documentList.some((document) => document.category === "knowledge_base");
  // Telefonszám lépés: meglévő számnál elég a választás, új számnál tulajdonos és dokumentumok (vagy az admin „megkapottnak” jelölte).
  const phoneDocs = isPhoneStepComplete(project);
  return { accounts, assistant, knowledge, phoneDocs, complete: accounts && assistant && knowledge && phoneDocs };
}
