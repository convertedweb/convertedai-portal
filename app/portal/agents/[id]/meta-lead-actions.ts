"use server";

import { revalidatePath } from "next/cache";
import { logAdminActivity } from "@/lib/activity-log";
import { canManageProjects, getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type MetaLeadSourceActionState = {
  error?: string;
  success?: string;
};

export type MetaPageConnectionActionState = MetaLeadSourceActionState;

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidExternalId(value: string) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

async function getWritableMetaProject(projectId: string) {
  const access = await getCurrentAdminAccess();
  if (!access.user || !canManageProjects(access.role)) {
    return { error: "Csak superadmin kezelheti a Meta lead forrásokat." } as const;
  }

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase szerveroldali konfiguráció." } as const;

  const { data: project, error } = await adminSupabase
    .from("projects")
    .select("id, organization_id, category")
    .eq("id", projectId)
    .eq("category", "meta_lead_caller")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !project) return { error: "Nem található Meta lead hívó asszisztens projekt." } as const;
  return { actorUserId: access.user.id, adminSupabase, project } as const;
}

function revalidateMetaProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/portal/agents/${projectId}`);
}

export async function saveMetaPageConnection(_previousState: MetaPageConnectionActionState, formData: FormData): Promise<MetaPageConnectionActionState> {
  const projectId = requiredText(formData.get("projectId"));
  const pageId = requiredText(formData.get("pageId"));
  const pageName = requiredText(formData.get("pageName"));

  if (!projectId || !pageName || !isValidExternalId(pageId)) {
    return { error: "Add meg a Facebook-oldal nevét és érvényes Page ID-ját." };
  }

  const writable = await getWritableMetaProject(projectId);
  if ("error" in writable) return { error: writable.error };

  const { data: currentConnection, error: connectionError } = await writable.adminSupabase
    .from("integration_connections")
    .select("id, external_resource_id")
    .eq("project_id", projectId)
    .eq("provider", "meta")
    .is("deleted_at", null)
    .maybeSingle();

  if (connectionError) return { error: "Nem sikerült ellenőrizni a jelenlegi Meta kapcsolatot." };

  if (currentConnection?.external_resource_id && currentConnection.external_resource_id !== pageId) {
    const { count } = await writable.adminSupabase
      .from("lead_sources")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("deleted_at", null);
    if ((count ?? 0) > 0) return { error: "Másik Facebook-oldal csak a meglévő lead űrlapok leválasztása után állítható be." };
  }

  const payload = {
    external_resource_id: pageId,
    external_resource_name: pageName.slice(0, 200),
    organization_id: writable.project.organization_id,
    project_id: projectId,
    provider: "meta",
    status: "connected",
  };
  const result = currentConnection
    ? await writable.adminSupabase.from("integration_connections").update(payload).eq("id", currentConnection.id)
    : await writable.adminSupabase.from("integration_connections").insert(payload);

  if (result.error) {
    console.error("Meta Page connection save failed", result.error);
    return { error: "Nem sikerült menteni a Facebook-oldal kapcsolatát." };
  }

  await logAdminActivity({
    actorUserId: writable.actorUserId,
    description: pageName,
    eventType: currentConnection ? "meta_page_connection_updated" : "meta_page_connection_created",
    metadata: { pageId },
    organizationId: writable.project.organization_id,
    projectId,
    title: currentConnection ? "Meta oldal kapcsolat frissítve" : "Meta oldal összekapcsolva",
  });
  revalidateMetaProject(projectId);
  return { success: "Facebook-oldal kapcsolat mentve." };
}

export async function createMetaLeadSource(_previousState: MetaLeadSourceActionState, formData: FormData): Promise<MetaLeadSourceActionState> {
  const projectId = requiredText(formData.get("projectId"));
  const formId = requiredText(formData.get("formId"));
  const formName = requiredText(formData.get("formName"));

  if (!projectId || !formName || !isValidExternalId(formId)) {
    return { error: "Add meg a lead űrlap nevét és érvényes Meta Form ID-ját." };
  }

  const writable = await getWritableMetaProject(projectId);
  if ("error" in writable) return { error: writable.error };

  const { data: connection, error: connectionError } = await writable.adminSupabase
    .from("integration_connections")
    .select("id, external_resource_id")
    .eq("project_id", projectId)
    .eq("provider", "meta")
    .eq("status", "connected")
    .is("deleted_at", null)
    .maybeSingle();
  if (connectionError || !connection?.external_resource_id) return { error: "Előbb kapcsold a projekthez a Facebook-oldalt." };

  const { error } = await writable.adminSupabase.from("lead_sources").insert({
    enabled: true,
    integration_connection_id: connection.id,
    meta_form_id: formId,
    meta_form_name: formName.slice(0, 300),
    organization_id: writable.project.organization_id,
    project_id: projectId,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ez a Meta űrlap már hozzá van rendelve egy projekthez." };
    console.error("Meta lead source creation failed", error);
    return { error: "Nem sikerült hozzáadni a Meta lead űrlapot." };
  }

  await logAdminActivity({
    actorUserId: writable.actorUserId,
    description: formName,
    eventType: "meta_lead_source_created",
    metadata: { formId },
    organizationId: writable.project.organization_id,
    projectId,
    title: "Meta lead űrlap hozzáadva",
  });

  revalidateMetaProject(projectId);
  return { success: "Meta lead űrlap hozzáadva." };
}

export async function setMetaLeadSourceEnabled(formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const sourceId = requiredText(formData.get("sourceId"));
  const enabled = requiredText(formData.get("enabled")) === "true";
  const writable = await getWritableMetaProject(projectId);
  if ("error" in writable || !sourceId) return;

  const { data: source, error } = await writable.adminSupabase
    .from("lead_sources")
    .update({ enabled })
    .eq("id", sourceId)
    .eq("organization_id", writable.project.organization_id)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .select("id, meta_form_name")
    .maybeSingle();

  if (error || !source) return;
  await logAdminActivity({
    actorUserId: writable.actorUserId,
    description: source.meta_form_name,
    eventType: enabled ? "meta_lead_source_enabled" : "meta_lead_source_disabled",
    metadata: { sourceId },
    organizationId: writable.project.organization_id,
    projectId,
    title: enabled ? "Meta lead űrlap bekapcsolva" : "Meta lead űrlap szüneteltetve",
  });
  revalidateMetaProject(projectId);
}

export async function removeMetaLeadSource(formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const sourceId = requiredText(formData.get("sourceId"));
  const writable = await getWritableMetaProject(projectId);
  if ("error" in writable || !sourceId) return;

  const { data: source, error } = await writable.adminSupabase
    .from("lead_sources")
    .update({ deleted_at: new Date().toISOString(), enabled: false })
    .eq("id", sourceId)
    .eq("organization_id", writable.project.organization_id)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .select("id, meta_form_name")
    .maybeSingle();

  if (error || !source) return;
  await logAdminActivity({
    actorUserId: writable.actorUserId,
    description: source.meta_form_name,
    eventType: "meta_lead_source_removed",
    metadata: { sourceId },
    organizationId: writable.project.organization_id,
    projectId,
    title: "Meta lead űrlap leválasztva",
  });
  revalidateMetaProject(projectId);
}
