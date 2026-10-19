import type { Project } from "./project-types";

export type AssistantFieldKey = "agentName" | "greeting" | "callInstructions" | "handoffInstructions";

export type AssistantField = {
  key: AssistantFieldKey;
  label: string;
  placeholder: string;
  multiline: boolean;
  rows: number;
  defaultOn: boolean;
  locked?: boolean;
};

export const assistantFieldCatalog: AssistantField[] = [
  { key: "agentName", label: "Asszisztens neve", placeholder: "", multiline: false, rows: 1, defaultOn: true, locked: true },
  { key: "greeting", label: "Köszöntés", placeholder: "Pl. Jó napot kívánok, Anna vagyok, a telefonos asszisztens.", multiline: true, rows: 3, defaultOn: true },
  { key: "callInstructions", label: "Híváskezelési instrukciók", placeholder: "Milyen kérdésekre válaszolhat, hogyan vegyen fel adatokat, mikor ajánljon visszahívást.", multiline: true, rows: 6, defaultOn: true },
  { key: "handoffInstructions", label: "Átadás / eszkaláció", placeholder: "Pl. sürgős ügy vagy panasz esetén kérjen visszahívási adatokat.", multiline: true, rows: 4, defaultOn: false },
];

export const defaultAssistantFieldKeys: AssistantFieldKey[] = assistantFieldCatalog.filter((field) => field.defaultOn).map((field) => field.key);

export function isAssistantFieldKey(value: string): value is AssistantFieldKey {
  return assistantFieldCatalog.some((field) => field.key === value);
}

// A nem beállított (null) kiválasztás az alapértelmezett mezőket adja; ismeretlen kulcsot eldobunk, a zárolt mező mindig bekerül.
export function resolveAssistantFields(selected: string[] | null | undefined): AssistantFieldKey[] {
  const keys = selected ?? defaultAssistantFieldKeys;
  return assistantFieldCatalog.filter((field) => field.locked || keys.includes(field.key)).map((field) => field.key);
}

export function assistantFieldValue(project: Project, key: AssistantFieldKey) {
  if (key === "agentName") return project.agentDisplayName === "Nincs megadva" ? "" : project.agentDisplayName;
  return project[key];
}
