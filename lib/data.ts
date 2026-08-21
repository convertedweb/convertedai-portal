import type { DocumentProcessingStatus, ElevenLabsAgentStatus, GoogleAccessStatus, PhoneRequestType, Project, ProjectCategory, ProjectDocument, ProjectStatus, TelnyxStatus } from "@/lib/project-types";
export { categoryLabels, documentStatusLabels, elevenLabsAgentStatusLabels, googleAccessStatusLabels, phoneRequestLabels, statusLabels, telnyxStatusLabels } from "@/lib/project-types";

export const mockProjects: Project[] = [
  {
    id: "fogorvos-projekt",
    name: "DentCare Fogászati Rendelő",
    agentDisplayName: "Anna, a DentCare recepciósa",
    category: "voice_agent",
    phoneNumber: "+36 30 555 0142",
    phoneRequestType: "hu_21",
    phoneDocumentsReceived: false,
    googleAccountEmail: null,
    googlePasswordShareUrl: null,
    googleAccessConfirmed: false,
    googleAccessStatus: "not_provided",
    googleAccessRequired: true,
    elevenLabsAgentId: null,
    elevenLabsAgentStatus: "not_created",
    elevenLabsAgentError: null,
    elevenLabsAgentCreatedAt: null,
    promptAssetsReceived: false,
    knowledgeAssetsReceived: false,
    monthlyMinuteLimit: 1000,
    carryoverMinutes: 500,
    status: "live",
    telnyxStatus: "connected",
    greeting: "Jó napot kívánok, Anna vagyok, a DentCare telefonos asszisztense.",
    callInstructions: "Foglaljon időpontot, válaszoljon a nyitvatartási és szolgáltatási kérdésekre, sürgős panasz esetén kérjen visszahívást.",
    handoffInstructions: "Sürgős fogászati fájdalom, lemondás vagy panasz esetén kérjen telefonszámot és jelezze, hogy munkatárs visszahívja.",
    plannedLaunchDate: null,
    launchedAt: "2026. augusztus 12.",
    launchedAtInput: null,
    createdAt: "2026. augusztus 1.",
    updatedAt: "2026. augusztus 12.",
    documents: 8,
    documentsReady: 8,
    documentList: [],
  },
  {
    id: "ugyvedi-iroda",
    name: "Kovács és Társa Ügyvédi Iroda",
    agentDisplayName: "Kovács Iroda telefonos asszisztense",
    category: "voice_agent",
    phoneNumber: null,
    phoneRequestType: "local_company",
    phoneDocumentsReceived: false,
    googleAccountEmail: "asszisztens@kovacsiroda.hu",
    googlePasswordShareUrl: "https://example.com/secure-share",
    googleAccessConfirmed: true,
    googleAccessStatus: "submitted",
    googleAccessRequired: true,
    elevenLabsAgentId: null,
    elevenLabsAgentStatus: "not_created",
    elevenLabsAgentError: null,
    elevenLabsAgentCreatedAt: null,
    promptAssetsReceived: false,
    knowledgeAssetsReceived: false,
    monthlyMinuteLimit: 1000,
    carryoverMinutes: 500,
    status: "building",
    telnyxStatus: "requested",
    greeting: "Jó napot kívánok, a Kovács Iroda telefonos asszisztense vagyok.",
    callInstructions: "Rögzítse a megkeresés tárgyát, a kapcsolatfelvételi adatokat és az ügy sürgősségét.",
    handoffInstructions: "Jogi tanácsot ne adjon, minden konkrét ügyben kérjen visszahívási adatot.",
    plannedLaunchDate: null,
    launchedAt: null,
    launchedAtInput: null,
    createdAt: "2026. augusztus 1.",
    updatedAt: "2026. augusztus 10.",
    documents: 5,
    documentsReady: 3,
    documentList: [],
  },
];

type DatabaseProject = {
  id: string;
  organization_id?: string;
  name: string;
  agent_display_name: string | null;
  category: ProjectCategory | null;
  phone_number: string | null;
  phone_request_type: PhoneRequestType | null;
  phone_documents_received: boolean | null;
  google_account_email: string | null;
  google_password_share_url: string | null;
  google_access_confirmed: boolean | null;
  google_access_status: GoogleAccessStatus | null;
  google_access_required: boolean | null;
  elevenlabs_agent_id: string | null;
  elevenlabs_agent_status: ElevenLabsAgentStatus | null;
  elevenlabs_agent_error: string | null;
  elevenlabs_agent_created_at: string | null;
  prompt_assets_received: boolean | null;
  knowledge_assets_received: boolean | null;
  monthly_minute_limit: number | null;
  carryover_minutes: number | null;
  status: ProjectStatus;
  telnyx_status: TelnyxStatus | null;
  greeting: string | null;
  call_instructions: string | null;
  handoff_instructions: string | null;
  planned_launch_date: string | null;
  launched_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DatabaseDocument = {
  id: string;
  project_id: string | null;
  category: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  processing_status: DocumentProcessingStatus;
  created_at: string | null;
};

type OrganizationMember = {
  organization_id: string;
};

type OrganizationName = {
  name: string | null;
  company_name?: string | null;
};

export type PortalUserSummary = {
  name: string;
  companyName: string;
  email: string;
  initials: string;
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value))
    : "Nincs adat";
}

function formatDateTimeLocal(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : null;
}

function getFirstName(name: string | null | undefined) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const firstName = parts.length > 1 ? parts[1] : parts[0];
  return firstName || "Norbert";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`
    : parts[0]?.slice(0, 2);

  return initials?.toUpperCase() || "UF";
}

function getNameFromEmail(email: string | undefined) {
  const localPart = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return localPart || "Ügyfél";
}

function mapDocument(document: DatabaseDocument): ProjectDocument {
  return {
    id: document.id,
    fileName: document.file_name,
    category: document.category,
    mimeType: document.mime_type,
    sizeBytes: document.size_bytes,
    processingStatus: document.processing_status,
    createdAt: formatDate(document.created_at),
  };
}

function mapProject(project: DatabaseProject, documents: DatabaseDocument[]): Project {
  const projectDocuments = documents.filter((document) => document.project_id === project.id);
  return {
    id: project.id,
    name: project.name,
    agentDisplayName: project.agent_display_name ?? "Nincs megadva",
    category: project.category ?? "voice_agent",
    phoneNumber: project.phone_number,
    phoneRequestType: project.phone_request_type,
    phoneDocumentsReceived: project.phone_documents_received ?? false,
    googleAccountEmail: project.google_account_email,
    googlePasswordShareUrl: project.google_password_share_url,
    googleAccessConfirmed: project.google_access_confirmed ?? false,
    googleAccessStatus: project.google_access_status ?? "not_provided",
    googleAccessRequired: project.google_access_required ?? true,
    elevenLabsAgentId: project.elevenlabs_agent_id,
    elevenLabsAgentStatus: project.elevenlabs_agent_status ?? "not_created",
    elevenLabsAgentError: project.elevenlabs_agent_error,
    elevenLabsAgentCreatedAt: formatDate(project.elevenlabs_agent_created_at),
    promptAssetsReceived: project.prompt_assets_received ?? false,
    knowledgeAssetsReceived: project.knowledge_assets_received ?? false,
    monthlyMinuteLimit: project.monthly_minute_limit ?? 1000,
    carryoverMinutes: project.carryover_minutes ?? 500,
    status: project.status,
    telnyxStatus: project.telnyx_status ?? (project.phone_number ? "connected" : "pending"),
    greeting: project.greeting ?? "",
    callInstructions: project.call_instructions ?? "",
    handoffInstructions: project.handoff_instructions ?? "",
    plannedLaunchDate: project.planned_launch_date,
    launchedAt: formatDate(project.launched_at),
    launchedAtInput: formatDateTimeLocal(project.launched_at),
    createdAt: formatDate(project.created_at),
    updatedAt: formatDate(project.updated_at),
    documents: projectDocuments.length,
    documentsReady: projectDocuments.filter((document) => document.processing_status === "ready").length,
    documentList: projectDocuments.map(mapDocument),
  };
}

export async function getProjects(): Promise<Project[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return mockProjects;
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return [];

    const { data: memberships, error: membershipError } = await supabase.from("org_members").select("organization_id").eq("user_id", user.id);
    if (membershipError || !memberships?.length) return [];
    const organizationIds = (memberships as OrganizationMember[]).map((membership) => membership.organization_id);

    const [{ data: projectRows, error: projectError }, { data: documentRows, error: documentError }] = await Promise.all([
      supabase.from("projects").select("id, name, agent_display_name, category, phone_number, phone_request_type, phone_documents_received, google_account_email, google_password_share_url, google_access_confirmed, google_access_status, google_access_required, elevenlabs_agent_id, elevenlabs_agent_status, elevenlabs_agent_error, elevenlabs_agent_created_at, prompt_assets_received, knowledge_assets_received, monthly_minute_limit, carryover_minutes, status, telnyx_status, greeting, call_instructions, handoff_instructions, planned_launch_date, launched_at, created_at, updated_at").in("organization_id", organizationIds).is("deleted_at", null).neq("status", "archived").order("created_at", { ascending: false }),
      supabase.from("documents").select("id, project_id, category, file_name, mime_type, size_bytes, processing_status, created_at").in("organization_id", organizationIds).is("deleted_at", null).order("created_at", { ascending: false }),
    ]);

    if (projectError || documentError) return [];
    if (!projectRows?.length) return [];
    return (projectRows as DatabaseProject[]).map((project) => mapProject(project, (documentRows ?? []) as DatabaseDocument[]));
  } catch {
    return mockProjects;
  }
}

export async function getPortalCustomerFirstName() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return "Norbert";
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return "Ügyfél";

    const { data: membership, error: membershipError } = await supabase
      .from("org_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (membershipError || !membership) return getFirstName(user.email?.split("@")[0]);

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", (membership as OrganizationMember).organization_id)
      .is("deleted_at", null)
      .single();

    if (organizationError || !organization) return getFirstName(user.email?.split("@")[0]);

    return getFirstName((organization as OrganizationName).name);
  } catch {
    return "Norbert";
  }
}

export async function getPortalUserSummary(): Promise<PortalUserSummary> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return { name: "Ügyfél", companyName: "Cég", email: "nincs bejelentkezve", initials: "UF" };
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { name: "Ügyfél", companyName: "Cég", email: "nincs bejelentkezve", initials: "UF" };

    const email = user.email ?? "nincs e-mail";
    const { data: membership, error: membershipError } = await supabase
      .from("org_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (membershipError || !membership) {
      const name = getNameFromEmail(user.email);
      return { name, companyName: name, email, initials: getInitials(name) };
    }

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("name, company_name")
      .eq("id", (membership as OrganizationMember).organization_id)
      .is("deleted_at", null)
      .single();

    const fallbackName = getNameFromEmail(user.email);
    const organizationName = organization as OrganizationName | null;
    const name = organizationError || !organizationName
      ? fallbackName
      : (organizationName.name ?? fallbackName);
    const companyName = organizationError || !organizationName
      ? fallbackName
      : (organizationName.company_name ?? organizationName.name ?? fallbackName);

    return { name, companyName, email, initials: getInitials(name) };
  } catch {
    return { name: "Ügyfél", companyName: "Cég", email: "nincs bejelentkezve", initials: "UF" };
  }
}

export async function getProject(id: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return mockProjects.find((project) => project.id === id);
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: projectRow, error: projectError } = await supabase
      .from("projects")
      .select("id, organization_id, name, agent_display_name, category, phone_number, phone_request_type, phone_documents_received, google_account_email, google_password_share_url, google_access_confirmed, google_access_status, google_access_required, elevenlabs_agent_id, elevenlabs_agent_status, elevenlabs_agent_error, elevenlabs_agent_created_at, prompt_assets_received, knowledge_assets_received, monthly_minute_limit, carryover_minutes, status, telnyx_status, greeting, call_instructions, handoff_instructions, planned_launch_date, launched_at, created_at, updated_at")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (projectError || !projectRow) return null;

    const project = projectRow as DatabaseProject;
    const { data: documentRows, error: documentError } = await supabase
      .from("documents")
      .select("id, project_id, category, file_name, mime_type, size_bytes, processing_status, created_at")
      .eq("project_id", project.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (documentError) return null;

    return mapProject(project, (documentRows ?? []) as DatabaseDocument[]);
  } catch {
    return mockProjects.find((project) => project.id === id);
  }
}
