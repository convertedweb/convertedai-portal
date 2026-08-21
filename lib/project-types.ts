export type ProjectStatus = "draft" | "review_requested" | "building" | "live" | "paused" | "archived";
export type ProjectCategory = "chatbot" | "voice_agent" | "automation";
export type TelnyxStatus = "pending" | "requested" | "connected" | "linked_to_voice_agent" | "failed";
export type PhoneRequestType = "hu_21" | "local_company" | "local_private";
export type GoogleAccessStatus = "not_provided" | "submitted" | "checking" | "working" | "failed";
export type DocumentProcessingStatus = "uploaded" | "processing" | "ready" | "failed";
export type ElevenLabsAgentStatus = "not_created" | "creating" | "created" | "failed";

export type Project = {
  id: string;
  name: string;
  agentDisplayName: string;
  category: ProjectCategory;
  phoneNumber: string | null;
  phoneRequestType: PhoneRequestType | null;
  phoneDocumentsReceived: boolean;
  googleAccountEmail: string | null;
  googlePasswordShareUrl: string | null;
  googleAccessConfirmed: boolean;
  googleAccessStatus: GoogleAccessStatus;
  googleAccessRequired: boolean;
  elevenLabsAgentId: string | null;
  elevenLabsAgentStatus: ElevenLabsAgentStatus;
  elevenLabsAgentError: string | null;
  elevenLabsAgentCreatedAt: string | null;
  promptAssetsReceived: boolean;
  knowledgeAssetsReceived: boolean;
  monthlyMinuteLimit: number | null;
  carryoverMinutes: number | null;
  status: ProjectStatus;
  telnyxStatus: TelnyxStatus;
  greeting: string;
  callInstructions: string;
  handoffInstructions: string;
  plannedLaunchDate: string | null;
  launchedAt: string | null;
  launchedAtInput: string | null;
  createdAt: string;
  updatedAt: string;
  documents: number;
  documentsReady: number;
  documentList: ProjectDocument[];
};

export type ProjectDocument = {
  id: string;
  fileName: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  processingStatus: DocumentProcessingStatus;
  createdAt: string;
};

export const statusLabels: Record<ProjectStatus, string> = {
  draft: "Előkészítés alatt",
  review_requested: "Ellenőrzésre vár",
  building: "Beállítás alatt",
  live: "Aktív",
  paused: "Szüneteltetve",
  archived: "Archivált",
};

export const categoryLabels: Record<ProjectCategory, string> = {
  chatbot: "Chatbot",
  voice_agent: "AI Voice Agent",
  automation: "AI automatizáció",
};

export const telnyxStatusLabels: Record<TelnyxStatus, string> = {
  pending: "Nincs igényelve",
  requested: "Igénylés folyamatban",
  connected: "Csatlakoztatva",
  linked_to_voice_agent: "Hozzá kapcsolva voice agenthez",
  failed: "Beavatkozást igényel",
};

export const phoneRequestLabels: Record<PhoneRequestType, string> = {
  hu_21: "06 21-es szám",
  local_company: "Saját körzetes szám - céges",
  local_private: "Saját körzetes szám - magánszemély",
};

export const googleAccessStatusLabels: Record<GoogleAccessStatus, string> = {
  not_provided: "Nincs megadva",
  submitted: "Beküldve",
  checking: "Ellenőrzés alatt",
  working: "Működik",
  failed: "Hibás",
};

export const documentStatusLabels: Record<DocumentProcessingStatus, string> = {
  uploaded: "Feltöltve",
  processing: "Feldolgozás alatt",
  ready: "Kész",
  failed: "Hibás",
};

export const elevenLabsAgentStatusLabels: Record<ElevenLabsAgentStatus, string> = {
  not_created: "Nincs létrehozva",
  creating: "Létrehozás folyamatban",
  created: "Létrehozva",
  failed: "Hibás",
};
