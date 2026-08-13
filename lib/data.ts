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

export const projects: Project[] = [
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

export function getProject(id: string) {
  return projects.find((project) => project.id === id);
}

export const statusLabels: Record<ProjectStatus, string> = {
  draft: "Előkészítés alatt",
  building: "Beállítás alatt",
  live: "Aktív",
  paused: "Szüneteltetve",
};
