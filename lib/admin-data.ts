import { redirect } from "next/navigation";
import { canManageCustomers, canManageProjects, getCurrentAdminAccess, type AdminPermissionSettings, type AdminRole } from "@/lib/admin-permissions";
import { getProject } from "@/lib/data";
import type { ElevenLabsAgentStatus, GoogleAccessStatus, PhoneRequestType, ProjectCategory, ProjectStatus, TelnyxStatus } from "@/lib/project-types";

export type OrganizationStatus = "onboarding" | "active" | "paused" | "churned";

export type AdminCustomer = {
  id: string;
  name: string;
  companyName: string;
  slug: string;
  status: OrganizationStatus;
  createdAt: string;
  members: number;
  projects: number;
  liveProjects: number;
  memberList: AdminCustomerMember[];
  projectList: AdminCustomerProject[];
};

export type AdminCustomerMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "client_owner" | "client_member";
  createdAt: string;
};

export type AdminCustomerProject = {
  id: string;
  name: string;
  agentDisplayName: string;
  category: ProjectCategory;
  phoneNumber: string | null;
  phoneRequestType: PhoneRequestType | null;
  phoneDocumentsReceived: boolean;
  googleAccessStatus: GoogleAccessStatus;
  googleAccessRequired: boolean;
  elevenLabsAgentId: string | null;
  elevenLabsAgentStatus: ElevenLabsAgentStatus;
  elevenLabsAgentError: string | null;
  elevenLabsAgentCreatedAt: string | null;
  promptAssetsReceived: boolean;
  knowledgeAssetsReceived: boolean;
  telnyxStatus: TelnyxStatus;
  status: ProjectStatus;
  greeting: string;
  callInstructions: string;
  updatedAt: string;
  documents: number;
  documentsReady: number;
};

export type AdminProjectListItem = AdminCustomerProject & {
  customerId: string;
  customerName: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  company_name: string | null;
  slug: string;
  status: OrganizationStatus;
  created_at: string | null;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  agent_display_name: string | null;
  category: ProjectCategory | null;
  phone_number: string | null;
  phone_request_type: PhoneRequestType | null;
  phone_documents_received: boolean | null;
  google_access_status: GoogleAccessStatus | null;
  google_access_required: boolean | null;
  elevenlabs_agent_id: string | null;
  elevenlabs_agent_status: ElevenLabsAgentStatus | null;
  elevenlabs_agent_error: string | null;
  elevenlabs_agent_created_at: string | null;
  prompt_assets_received: boolean | null;
  knowledge_assets_received: boolean | null;
  telnyx_status: TelnyxStatus | null;
  status: ProjectStatus;
  greeting: string | null;
  call_instructions: string | null;
  updated_at: string | null;
};

type DocumentRow = {
  project_id: string | null;
  processing_status: "uploaded" | "processing" | "ready" | "failed";
};

type MemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: "client_owner" | "client_member";
  created_at: string | null;
};

function getAdminUserName(user: { email?: string; user_metadata?: { full_name?: string; name?: string } } | null) {
  return user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "Admin";
}

export const customerStatusLabels: Record<OrganizationStatus, string> = {
  onboarding: "Bevezetés alatt",
  active: "Aktív",
  paused: "Szüneteltetve",
  churned: "Lezárt",
};

export const mockAdminCustomers: AdminCustomer[] = [
  {
    id: "demo-converted",
    name: "norpheus AI Demo ügyfél",
    companyName: "Converted Web Kft.",
    slug: "norpheus-demo",
    status: "active",
    createdAt: "2026. augusztus 13.",
    members: 1,
    projects: 2,
    liveProjects: 1,
    memberList: [
      {
        id: "demo-member",
        userId: "demo-user",
        name: "Horváth Norbert",
        email: "honorbert@gmail.com",
        role: "client_owner",
        createdAt: "2026. augusztus 13.",
      },
    ],
    projectList: [
      {
        id: "fogorvos-projekt",
        name: "DentCare Fogászati Rendelő",
        agentDisplayName: "Anna, a DentCare recepciósa",
        category: "voice_agent",
        phoneNumber: "+36 30 555 0142",
        phoneRequestType: "hu_21",
        phoneDocumentsReceived: true,
        googleAccessStatus: "working",
        googleAccessRequired: true,
        elevenLabsAgentId: null,
        elevenLabsAgentStatus: "not_created",
        elevenLabsAgentError: null,
        elevenLabsAgentCreatedAt: null,
        promptAssetsReceived: true,
        knowledgeAssetsReceived: true,
        telnyxStatus: "linked_to_voice_agent",
        status: "live",
        greeting: "Üdvözlöm!",
        callInstructions: "Foglalások kezelése.",
        updatedAt: "2026. augusztus 12.",
        documents: 8,
        documentsReady: 8,
      },
      {
        id: "ugyvedi-iroda",
        name: "Kovács és Társa Ügyvédi Iroda",
        agentDisplayName: "Kovács Iroda telefonos asszisztense",
        category: "voice_agent",
        phoneNumber: null,
        phoneRequestType: "local_company",
        phoneDocumentsReceived: false,
        googleAccessStatus: "not_provided",
        googleAccessRequired: true,
        elevenLabsAgentId: null,
        elevenLabsAgentStatus: "not_created",
        elevenLabsAgentError: null,
        elevenLabsAgentCreatedAt: null,
        promptAssetsReceived: false,
        knowledgeAssetsReceived: false,
        telnyxStatus: "requested",
        status: "building",
        greeting: "",
        callInstructions: "",
        updatedAt: "2026. augusztus 10.",
        documents: 5,
        documentsReady: 3,
      },
    ],
  },
];

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value))
    : "Nincs adat";
}

export async function getAdminCustomers(): Promise<{ adminPermissions: AdminPermissionSettings; isAdmin: boolean; canManageCustomers: boolean; canManageProjects: boolean; adminRole: AdminRole | null; customers: AdminCustomer[]; userEmail: string | null; userName: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return { adminPermissions: { canCreateCustomers: true, canEditCustomers: true, canInviteCustomerUsers: true, canViewCustomers: true, canViewPhoneNumbers: true, canViewProjects: true }, isAdmin: true, canManageCustomers: true, canManageProjects: true, adminRole: "superadmin", customers: mockAdminCustomers, userEmail: "demo@norpheus.local", userName: "Demo Admin" };
  }

  const { permissions, user, role } = await getCurrentAdminAccess();
  if (!user) redirect("/login?next=/admin");
  if (!role) return { adminPermissions: permissions, isAdmin: false, canManageCustomers: false, canManageProjects: false, adminRole: null, customers: [], userEmail: user.email ?? null, userName: getAdminUserName(user) };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const [{ data: organizations }, { data: projects }, { data: members }, { data: documents }] = await Promise.all([
    supabase.from("organizations").select("id, name, company_name, slug, status, created_at").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("projects").select("id, organization_id, name, agent_display_name, category, phone_number, phone_request_type, phone_documents_received, google_access_status, google_access_required, elevenlabs_agent_id, elevenlabs_agent_status, elevenlabs_agent_error, elevenlabs_agent_created_at, prompt_assets_received, knowledge_assets_received, telnyx_status, status, greeting, call_instructions, updated_at").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("org_members").select("id, organization_id, user_id, role, created_at"),
    supabase.from("documents").select("project_id, processing_status").is("deleted_at", null),
  ]);

  const projectRows = (projects ?? []) as ProjectRow[];
  const memberRows = (members ?? []) as MemberRow[];
  const documentRows = (documents ?? []) as DocumentRow[];
  const organizationIds = ((organizations ?? []) as OrganizationRow[]).map((organization) => organization.id);
  const { data: memberProfiles } = organizationIds.length
    ? await supabase.rpc("admin_customer_members", { p_organization_ids: organizationIds })
    : { data: [] };
  const memberProfileRows = (memberProfiles ?? []) as Array<{
    id: string;
    organization_id: string;
    user_id: string;
    name: string | null;
    email: string | null;
    role: "client_owner" | "client_member";
    created_at: string | null;
  }>;

  return {
    adminPermissions: permissions,
    isAdmin: true,
    canManageCustomers: canManageCustomers(role, permissions),
    canManageProjects: canManageProjects(role),
    adminRole: role,
    userEmail: user.email ?? null,
    userName: getAdminUserName(user),
    customers: ((organizations ?? []) as OrganizationRow[]).map((organization) => {
      const organizationProjects = projectRows.filter((project) => project.organization_id === organization.id);
      const organizationMembers = memberRows.filter((member) => member.organization_id === organization.id);
      const organizationMemberProfiles = memberProfileRows.filter((member) => member.organization_id === organization.id);
      const memberCount = Math.max(organizationMembers.length, organizationMemberProfiles.length, organization.name ? 1 : 0);
      return {
        id: organization.id,
        name: organization.name,
        companyName: organization.company_name ?? organization.name,
        slug: organization.slug,
        status: organization.status,
        createdAt: formatDate(organization.created_at),
        members: memberCount,
        projects: organizationProjects.length,
        liveProjects: organizationProjects.filter((project) => project.status === "live").length,
        memberList: organizationMembers.map((member) => {
          const profile = organizationMemberProfiles.find((item) => item.id === member.id);
          return {
            id: member.id,
            userId: member.user_id,
            name: profile?.name ?? "Nincs név",
            email: profile?.email ?? "Nincs e-mail",
            role: member.role,
            createdAt: formatDate(member.created_at),
          };
        }),
        projectList: organizationProjects.map((project) => {
          const projectDocuments = documentRows.filter((document) => document.project_id === project.id);
          return {
            id: project.id,
            name: project.name,
            agentDisplayName: project.agent_display_name ?? "Nincs megadva",
            category: project.category ?? "voice_agent",
            phoneNumber: project.phone_number,
            phoneRequestType: project.phone_request_type,
            phoneDocumentsReceived: project.phone_documents_received ?? false,
            googleAccessStatus: project.google_access_status ?? "not_provided",
            googleAccessRequired: project.google_access_required ?? true,
            elevenLabsAgentId: project.elevenlabs_agent_id,
            elevenLabsAgentStatus: project.elevenlabs_agent_status ?? "not_created",
            elevenLabsAgentError: project.elevenlabs_agent_error,
            elevenLabsAgentCreatedAt: formatDate(project.elevenlabs_agent_created_at),
            promptAssetsReceived: project.prompt_assets_received ?? false,
            knowledgeAssetsReceived: project.knowledge_assets_received ?? false,
            telnyxStatus: project.telnyx_status ?? (project.phone_number ? "connected" : "pending"),
            status: project.status,
            greeting: project.greeting ?? "",
            callInstructions: project.call_instructions ?? "",
            updatedAt: formatDate(project.updated_at),
            documents: projectDocuments.length,
            documentsReady: projectDocuments.filter((document) => document.processing_status === "ready").length,
          };
        }),
      };
    }),
  };
}

export async function getAdminCustomer(id: string): Promise<{ adminPermissions: AdminPermissionSettings; isAdmin: boolean; canManageCustomers: boolean; canManageProjects: boolean; adminRole: AdminRole | null; customer: AdminCustomer | null; userEmail: string | null; userName: string }> {
  const { adminPermissions, isAdmin, canManageCustomers, canManageProjects, adminRole, customers, userEmail, userName } = await getAdminCustomers();

  return {
    adminPermissions,
    isAdmin,
    canManageCustomers,
    canManageProjects,
    adminRole,
    userEmail,
    userName,
    customer: customers.find((customer) => customer.id === id) ?? null,
  };
}

export async function getAdminProject(id: string) {
  const { adminPermissions, isAdmin, canManageCustomers, canManageProjects, adminRole, customers, userEmail, userName } = await getAdminCustomers();
  const customer = customers.find((item) => item.projectList.some((project) => project.id === id)) ?? null;
  const project = isAdmin ? await getProject(id) : null;

  return {
    isAdmin,
    adminPermissions,
    canManageCustomers,
    canManageProjects,
    adminRole,
    userEmail,
    userName,
    customer,
    project,
  };
}

export async function getAdminProjects(): Promise<{ adminPermissions: AdminPermissionSettings; isAdmin: boolean; canManageCustomers: boolean; canManageProjects: boolean; adminRole: AdminRole | null; projects: AdminProjectListItem[]; userEmail: string | null; userName: string }> {
  const { adminPermissions, isAdmin, canManageCustomers, canManageProjects, adminRole, customers, userEmail, userName } = await getAdminCustomers();

  return {
    adminPermissions,
    isAdmin,
    canManageCustomers,
    canManageProjects,
    adminRole,
    userEmail,
    userName,
    projects: customers.flatMap((customer) =>
      customer.projectList.map((project) => ({
        ...project,
        customerId: customer.id,
        customerName: customer.companyName,
      })),
    ),
  };
}
