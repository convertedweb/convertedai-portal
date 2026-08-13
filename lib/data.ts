export type ProjectStatus = "draft" | "building" | "live" | "paused";

export type Project = {
  id: string;
  name: string;
  agentDisplayName: string;
  phoneNumber: string | null;
  status: ProjectStatus;
  updatedAt: string;
  documents: number;
  documentsReady: number;
};

export const mockProjects: Project[] = [
  {
    id: "fogorvos-projekt",
    name: "DentCare Fogászati Rendelő",
    agentDisplayName: "Anna, a DentCare recepciósa",
    phoneNumber: "+36 30 555 0142",
    status: "live",
    updatedAt: "2026. augusztus 12.",
    documents: 8,
    documentsReady: 8,
  },
  {
    id: "ugyvedi-iroda",
    name: "Kovács és Társa Ügyvédi Iroda",
    agentDisplayName: "Kovács Iroda telefonos asszisztense",
    phoneNumber: null,
    status: "building",
    updatedAt: "2026. augusztus 10.",
    documents: 5,
    documentsReady: 3,
  },
];

type DatabaseProject = {
  id: string;
  name: string;
  agent_display_name: string | null;
  phone_number: string | null;
  status: ProjectStatus;
  updated_at: string | null;
};

type DatabaseDocument = {
  project_id: string | null;
  processing_status: "uploaded" | "processing" | "ready" | "failed";
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value))
    : "Nincs adat";
}

function mapProject(project: DatabaseProject, documents: DatabaseDocument[]): Project {
  const projectDocuments = documents.filter((document) => document.project_id === project.id);
  return {
    id: project.id,
    name: project.name,
    agentDisplayName: project.agent_display_name ?? "Nincs megadva",
    phoneNumber: project.phone_number,
    status: project.status,
    updatedAt: formatDate(project.updated_at),
    documents: projectDocuments.length,
    documentsReady: projectDocuments.filter((document) => document.processing_status === "ready").length,
  };
}

export async function getProjects(): Promise<Project[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return mockProjects;
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const [{ data: projectRows, error: projectError }, { data: documentRows, error: documentError }] = await Promise.all([
      supabase.from("projects").select("id, name, agent_display_name, phone_number, status, updated_at").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("documents").select("project_id, processing_status").is("deleted_at", null),
    ]);

    if (projectError || documentError || !projectRows?.length) return mockProjects;
    return (projectRows as DatabaseProject[]).map((project) => mapProject(project, (documentRows ?? []) as DatabaseDocument[]));
  } catch {
    return mockProjects;
  }
}

export async function getProject(id: string) {
  const currentProjects = await getProjects();
  return currentProjects.find((project) => project.id === id);
}

export const statusLabels: Record<ProjectStatus, string> = {
  draft: "Előkészítés alatt",
  building: "Beállítás alatt",
  live: "Aktív",
  paused: "Szüneteltetve",
};
