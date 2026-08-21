"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAdminActivity } from "@/lib/activity-log";
import { canManageProjects, getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createElevenLabsAgent, updateElevenLabsKnowledgeBaseDocument } from "@/lib/elevenlabs";
import type { GoogleAccessStatus, ProjectCategory, ProjectStatus, TelnyxStatus } from "@/lib/project-types";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProjectAdminActionState = {
  error?: string;
  success?: string;
};

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseProjectStatus(value: FormDataEntryValue | null): ProjectStatus | null {
  return value === "draft" || value === "review_requested" || value === "building" || value === "live" || value === "paused" || value === "archived"
    ? value
    : null;
}

function parseProjectCategory(value: FormDataEntryValue | null): ProjectCategory | null {
  return value === "voice_agent" || value === "chatbot" || value === "automation" ? value : null;
}

function parseTelnyxStatus(value: FormDataEntryValue | null): TelnyxStatus | null {
  return value === "pending" || value === "requested" || value === "connected" || value === "linked_to_voice_agent" || value === "failed" ? value : null;
}

function parseGoogleAccessStatus(value: FormDataEntryValue | null): GoogleAccessStatus | null {
  return value === "not_provided" || value === "submitted" || value === "checking" || value === "working" || value === "failed" ? value : null;
}

function optionalDate(value: FormDataEntryValue | null) {
  const date = requiredText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function optionalDateTime(value: FormDataEntryValue | null) {
  const dateTime = requiredText(value);
  return dateTime ? new Date(dateTime).toISOString() : null;
}

function optionalNonNegativeInteger(value: FormDataEntryValue | null) {
  const text = requiredText(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function getProjectRedirect(projectId: string, source: string) {
  return source === "projects" ? `/admin/projects/${projectId}?from=projects` : `/admin/projects/${projectId}`;
}

async function assertSuperAdmin() {
  const { user, role } = await getCurrentAdminAccess();

  if (!user) {
    return { error: "A törléshez újra be kell jelentkezni." };
  }

  if (!canManageProjects(role)) {
    return { error: "Projekteket csak superadmin módosíthat." };
  }

  return { user, role };
}

function getAdminSupabase() {
  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return { error: "Hiányzik a Supabase titkos szerveroldali kulcs. Add meg a SUPABASE_SECRET_KEY értéket a .env.local fájlban." };
  }

  return { adminSupabase };
}

export async function archiveProject(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));
  const source = requiredText(formData.get("source"));

  if (!projectId || !customerId) {
    return { error: "Hiányzik a projekt vagy ügyfél azonosító." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminAccess = getAdminSupabase();
  if ("error" in adminAccess) return { error: adminAccess.error };

  const updatedAt = new Date().toISOString();
  const { data: project, error: projectError } = await adminAccess.adminSupabase
    .from("projects")
    .update({ status: "archived", updated_at: updatedAt })
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Project archive failed", projectError);
    return { error: "Nem sikerült archiválni a projektet. Lehet, hogy már törölve lett vagy nem ehhez az ügyfélhez tartozik." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_project_archived",
    organizationId: customerId,
    projectId,
    title: "Projekt archiválva",
    description: "A superadmin archiválta a projektet.",
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);

  redirect(getProjectRedirect(projectId, source));
}

export async function updateProjectStatus(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));
  const source = requiredText(formData.get("source"));
  const status = parseProjectStatus(formData.get("status"));

  if (!projectId || !customerId || !status) {
    return { error: "Hiányzik a projekt, ügyfél vagy státusz adat." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminAccess = getAdminSupabase();
  if ("error" in adminAccess) return { error: adminAccess.error };

  const updatedAt = new Date().toISOString();
  const { data: project, error: projectError } = await adminAccess.adminSupabase
    .from("projects")
    .update({ status, updated_at: updatedAt })
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Project status update failed", projectError);
    return { error: "Nem sikerült módosítani a projekt státuszát." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_project_status_updated",
    organizationId: customerId,
    projectId,
    title: "Projekt státusz módosítva",
    description: status,
    metadata: { status },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);

  redirect(getProjectRedirect(projectId, source));
}

export async function updateProjectSettings(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));
  const source = requiredText(formData.get("source"));
  const name = requiredText(formData.get("projectName"));
  const category = parseProjectCategory(formData.get("category"));
  const currentStatus = parseProjectStatus(formData.get("currentStatus"));
  const plannedLaunchDate = optionalDate(formData.get("plannedLaunchDate"));
  const launchedAt = currentStatus === "live" ? optionalDateTime(formData.get("launchedAt")) : null;

  if (!projectId || !customerId || !name || !category || !currentStatus) {
    return { error: "A projekt neve, kategóriája és azonosítói kötelezők." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminAccess = getAdminSupabase();
  if ("error" in adminAccess) return { error: adminAccess.error };

  const { data: project, error: projectError } = await adminAccess.adminSupabase
    .from("projects")
    .update({
      name,
      category,
      planned_launch_date: plannedLaunchDate,
      launched_at: launchedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Project settings update failed", projectError);
    return { error: "Nem sikerült menteni a projekt beállításait." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_project_settings_updated",
    organizationId: customerId,
    projectId,
    title: "Projekt részletek módosítva",
    description: name,
    metadata: { category, launchedAt, name, plannedLaunchDate },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);

  redirect(getProjectRedirect(projectId, source));
}

export async function updateProjectMinuteLimits(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));
  const monthlyMinuteLimit = optionalNonNegativeInteger(formData.get("monthlyMinuteLimit"));
  const carryoverMinutes = optionalNonNegativeInteger(formData.get("carryoverMinutes"));

  if (!projectId || !customerId) {
    return { error: "Hiányzik a projekt vagy az ügyfél azonosítója." };
  }

  if (Number.isNaN(monthlyMinuteLimit) || Number.isNaN(carryoverMinutes)) {
    return { error: "A havi keret és az átvihető percek csak nem negatív egész számok lehetnek." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminAccess = getAdminSupabase();
  if ("error" in adminAccess) return { error: adminAccess.error };

  const { data: project, error: projectError } = await adminAccess.adminSupabase
    .from("projects")
    .update({
      monthly_minute_limit: monthlyMinuteLimit ?? 1000,
      carryover_minutes: carryoverMinutes ?? 500,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Project minute limits update failed", projectError);
    return { error: "Nem sikerült menteni a forgalmi kereteket." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_project_minute_limits_updated",
    organizationId: customerId,
    projectId,
    title: "Forgalmi keretek módosítva",
    description: `${monthlyMinuteLimit ?? 1000} perc / ${carryoverMinutes ?? 500} perc átvihető`,
    metadata: { carryoverMinutes: carryoverMinutes ?? 500, monthlyMinuteLimit: monthlyMinuteLimit ?? 1000 },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);

  return { success: "A forgalmi keretek mentve." };
}

export async function updateProjectPhone(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));
  const source = requiredText(formData.get("source"));
  const phoneNumber = requiredText(formData.get("phoneNumber")) || null;
  const telnyxStatus = parseTelnyxStatus(formData.get("telnyxStatus"));
  const phoneDocumentsReceived = formData.get("phoneDocumentsReceived") === "on";

  if (!projectId || !customerId || !telnyxStatus) {
    return { error: "A projekt azonosító és a Telnyx státusz kötelező." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminAccess = getAdminSupabase();
  if ("error" in adminAccess) return { error: adminAccess.error };

  const { data: project, error: projectError } = await adminAccess.adminSupabase
    .from("projects")
    .update({
      phone_number: phoneNumber,
      telnyx_status: telnyxStatus,
      phone_documents_received: phoneDocumentsReceived,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Project phone update failed", projectError);
    const isPermissionError = projectError?.code === "42501" || projectError?.message?.toLowerCase().includes("permission");
    const isConstraintError = projectError?.code === "23514" || projectError?.message?.toLowerCase().includes("check constraint");
    return {
      error: isPermissionError
        ? "A Supabase jelenleg nem engedi a Telnyx státusz mentését. Futtasd le a 0017_project_telnyx_status_update_grant.sql migrációt."
        : isConstraintError
          ? "A Supabase még nem fogadja el ezt a Telnyx státuszt. Futtasd le a 0016_telnyx_voice_agent_linked_status.sql migrációt."
          : "Nem sikerült menteni a telefonszámot. Ellenőrizd, hogy a projekt még ehhez az ügyfélhez tartozik-e.",
    };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_project_phone_updated",
    organizationId: customerId,
    projectId,
    title: "Telefonos kapcsolat módosítva",
    description: phoneNumber ?? "Nincs telefonszám",
    metadata: { phoneDocumentsReceived, phoneNumber, telnyxStatus },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);

  redirect(getProjectRedirect(projectId, source));
}

export async function updateProjectGoogleAccess(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));
  const source = requiredText(formData.get("source"));
  const googleAccountEmail = requiredText(formData.get("googleAccountEmail")) || null;
  const googlePasswordShareUrl = requiredText(formData.get("googlePasswordShareUrl")) || null;
  const googleAccessStatus = parseGoogleAccessStatus(formData.get("googleAccessStatus"));
  const googleAccessRequired = formData.get("googleAccessRequired") === "on";

  if (!projectId || !customerId || !googleAccessStatus) {
    return { error: "A projekt azonosító és a Google hozzáférés státusz kötelező." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminAccess = getAdminSupabase();
  if ("error" in adminAccess) return { error: adminAccess.error };

  const { data: project, error: projectError } = await adminAccess.adminSupabase
    .from("projects")
    .update({
      google_account_email: googleAccountEmail,
      google_password_share_url: googlePasswordShareUrl,
      google_access_confirmed: Boolean(googleAccountEmail && googlePasswordShareUrl),
      google_access_status: googleAccessStatus,
      google_access_required: googleAccessRequired,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Project Google access update failed", projectError);
    return { error: "Nem sikerült menteni a Google hozzáférést." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_project_google_access_updated",
    organizationId: customerId,
    projectId,
    title: "Google hozzáférés módosítva",
    description: googleAccountEmail ?? "Nincs Google fiók",
    metadata: { googleAccessRequired, googleAccessStatus, googleAccountEmail, hasPasswordShareUrl: Boolean(googlePasswordShareUrl) },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);

  redirect(getProjectRedirect(projectId, source));
}

export async function updateProjectAssetFlags(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));
  const source = requiredText(formData.get("source"));
  const promptAssetsReceived = formData.get("promptAssetsReceived") === "on";
  const knowledgeAssetsReceived = formData.get("knowledgeAssetsReceived") === "on";

  if (!projectId || !customerId) {
    return { error: "Hiányzik a projekt vagy ügyfél azonosító." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminAccess = getAdminSupabase();
  if ("error" in adminAccess) return { error: adminAccess.error };

  const { data: project, error: projectError } = await adminAccess.adminSupabase
    .from("projects")
    .update({
      prompt_assets_received: promptAssetsReceived,
      knowledge_assets_received: knowledgeAssetsReceived,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Project asset flags update failed", projectError);
    return { error: "Nem sikerült menteni a külső anyagok állapotát." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_project_assets_updated",
    organizationId: customerId,
    projectId,
    title: "Külső anyagok állapota módosítva",
    description: "Prompt és tudásbázis készültségi jelölések frissítve.",
    metadata: { knowledgeAssetsReceived, promptAssetsReceived },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);

  redirect(getProjectRedirect(projectId, source));
}

export async function provisionElevenLabsAgent(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));
  const source = requiredText(formData.get("source"));

  if (!projectId || !customerId) {
    return { error: "Hiányzik a projekt vagy ügyfél azonosító." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminAccess = getAdminSupabase();
  if ("error" in adminAccess) return { error: adminAccess.error };

  const { data: project, error: projectError } = await adminAccess.adminSupabase
    .from("projects")
    .select("id, organization_id, name, agent_display_name, greeting, call_instructions, elevenlabs_agent_id, organizations(company_name, name)")
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .single();

  if (projectError || !project) {
    console.error("ElevenLabs provisioning project lookup failed", projectError);
    return { error: "Nem található ez a projekt." };
  }

  if (project.elevenlabs_agent_id) {
    return { error: "Ehhez a projekthez már tartozik ElevenLabs agent." };
  }

  await adminAccess.adminSupabase
    .from("projects")
    .update({
      elevenlabs_agent_error: null,
      elevenlabs_agent_status: "creating",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("organization_id", customerId);

  const organization = Array.isArray(project.organizations) ? project.organizations[0] : project.organizations;
  const companyName = organization?.company_name ?? organization?.name ?? "Ügyfél";
  const agentName = project.agent_display_name ?? project.name;
  const result = await createElevenLabsAgent({
    agentName,
    companyName,
    greeting: project.greeting ?? "",
    instructions: project.call_instructions ?? "",
    projectId,
    projectName: project.name,
  });

  if ("error" in result) {
    await adminAccess.adminSupabase
      .from("projects")
      .update({
        elevenlabs_agent_error: result.rawError ?? result.error,
        elevenlabs_agent_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("organization_id", customerId);

    return { error: result.error };
  }

  const createdAt = new Date().toISOString();
  const { error: updateError } = await adminAccess.adminSupabase
    .from("projects")
    .update({
      elevenlabs_agent_created_at: createdAt,
      elevenlabs_agent_error: null,
      elevenlabs_agent_id: result.agentId,
      elevenlabs_agent_status: "created",
      updated_at: createdAt,
    })
    .eq("id", projectId)
    .eq("organization_id", customerId);

  if (updateError) {
    console.error("ElevenLabs agent id save failed", updateError);
    return { error: "Az ElevenLabs agent létrejött, de az azonosítót nem sikerült menteni a projekthez." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_elevenlabs_agent_created",
    organizationId: customerId,
    projectId,
    title: "ElevenLabs agent létrehozva",
    description: result.agentId,
    metadata: { agentId: result.agentId },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);

  redirect(getProjectRedirect(projectId, source));
}

export async function updateElevenLabsAgentId(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));
  const source = requiredText(formData.get("source"));
  const elevenLabsAgentId = requiredText(formData.get("elevenLabsAgentId"));

  if (!projectId || !customerId) {
    return { error: "Hiányzik a projekt vagy ügyfél azonosító." };
  }

  if (!elevenLabsAgentId) {
    return { error: "Add meg a meglévő ElevenLabs agent ID-t." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminAccess = getAdminSupabase();
  if ("error" in adminAccess) return { error: adminAccess.error };

  const updatedAt = new Date().toISOString();
  const { data: project, error: projectError } = await adminAccess.adminSupabase
    .from("projects")
    .update({
      elevenlabs_agent_created_at: updatedAt,
      elevenlabs_agent_error: null,
      elevenlabs_agent_id: elevenLabsAgentId,
      elevenlabs_agent_status: "created",
      updated_at: updatedAt,
    })
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("ElevenLabs agent id update failed", projectError);
    return { error: "Nem sikerült menteni az ElevenLabs agent ID-t." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_elevenlabs_agent_id_updated",
    organizationId: customerId,
    projectId,
    title: "ElevenLabs agent ID beállítva",
    description: elevenLabsAgentId,
    metadata: { agentId: elevenLabsAgentId },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);

  redirect(getProjectRedirect(projectId, source));
}

export async function updateAgentKnowledgeBaseDocument(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));
  const source = requiredText(formData.get("source"));
  const documentationId = requiredText(formData.get("documentationId"));
  const name = requiredText(formData.get("documentName"));
  const content = requiredText(formData.get("documentContent"));

  if (!projectId || !customerId || !documentationId) {
    return { error: "Hiányzik a projekt, ügyfél vagy tudásbázis azonosító." };
  }

  if (!name || !content) {
    return { error: "A fájlnév és a tartalom nem lehet üres." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const result = await updateElevenLabsKnowledgeBaseDocument({
    content,
    documentationId,
    name,
  });

  if (result.error) {
    console.error("Agent knowledge base update failed", result.rawError ?? result.error);
    return { error: "Nem sikerült feltölteni az agent tudásbázis módosításait." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_agent_knowledge_base_updated",
    organizationId: customerId,
    projectId,
    title: "Agent tudásbázis módosítva",
    description: name,
    metadata: { documentationId, name },
  });

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/portal/agents/${projectId}`);

  redirect(getProjectRedirect(projectId, source));
}

export async function deleteProject(_previousState: ProjectAdminActionState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const customerId = requiredText(formData.get("customerId"));

  if (!projectId || !customerId) {
    return { error: "Hiányzik a projekt vagy ügyfél azonosító." };
  }

  const adminCheck = await assertSuperAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminAccess = getAdminSupabase();
  if ("error" in adminAccess) return { error: adminAccess.error };

  const deletedAt = new Date().toISOString();
  const { data: project, error: projectError } = await adminAccess.adminSupabase
    .from("projects")
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .eq("status", "archived")
    .is("deleted_at", null)
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Project delete failed", projectError);
    return { error: "Projektet csak archivált állapotban lehet törölni." };
  }

  const { error: documentsError } = await adminAccess.adminSupabase
    .from("documents")
    .update({ deleted_at: deletedAt })
    .eq("project_id", projectId)
    .is("deleted_at", null);

  if (documentsError) {
    console.error("Project documents soft delete failed", documentsError);
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_project_deleted",
    organizationId: customerId,
    projectId,
    title: "Projekt törölve",
    description: "A superadmin törölte az archivált projektet.",
    metadata: { deletedAt },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);

  redirect(`/admin/customers/${customerId}/edit`);
}
