"use server";

import { revalidatePath } from "next/cache";
import { logAdminActivity } from "@/lib/activity-log";
import { canManageProjects, getCurrentAdminAccess } from "@/lib/admin-permissions";
import { normalizeBusinessHours, parseNotifyEmailsInput, weekdayKeys } from "@/lib/lead-call";
import { normalizeWebsiteUrl } from "@/lib/lead-sources";
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

export async function createWebsiteLeadSource(_previousState: MetaLeadSourceActionState, formData: FormData): Promise<MetaLeadSourceActionState> {
  const projectId = requiredText(formData.get("projectId"));
  const formName = requiredText(formData.get("websiteFormName"));
  const websiteUrl = normalizeWebsiteUrl(requiredText(formData.get("websiteUrl")));

  if (!projectId || !formName || !websiteUrl) {
    return { error: "Add meg a weboldal űrlap nevét és egy érvényes oldal-URL-t (pl. https://pelda.hu/kapcsolat)." };
  }

  const writable = await getWritableMetaProject(projectId);
  if ("error" in writable) return { error: writable.error };

  const { error } = await writable.adminSupabase.from("lead_sources").insert({
    enabled: true,
    meta_form_name: formName.slice(0, 300),
    organization_id: writable.project.organization_id,
    project_id: projectId,
    source_type: "website_form",
    website_url: websiteUrl,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ez a weboldal űrlap már hozzá van rendelve ehhez a projekthez." };
    console.error("Website lead source creation failed", error);
    return { error: "Nem sikerült hozzáadni a weboldal űrlapot." };
  }

  await logAdminActivity({
    actorUserId: writable.actorUserId,
    description: formName,
    eventType: "website_lead_source_created",
    metadata: { websiteUrl },
    organizationId: writable.project.organization_id,
    projectId,
    title: "Weboldal űrlap hozzáadva",
  });

  revalidateMetaProject(projectId);
  return { success: "Weboldal űrlap hozzáadva." };
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
    .select("id, meta_form_name, source_type")
    .maybeSingle();

  if (error || !source) return;
  const isWebsite = source.source_type === "website_form";
  await logAdminActivity({
    actorUserId: writable.actorUserId,
    description: source.meta_form_name,
    eventType: isWebsite ? (enabled ? "website_lead_source_enabled" : "website_lead_source_disabled") : enabled ? "meta_lead_source_enabled" : "meta_lead_source_disabled",
    metadata: { sourceId },
    organizationId: writable.project.organization_id,
    projectId,
    title: `${isWebsite ? "Weboldal űrlap" : "Meta lead űrlap"} ${enabled ? "bekapcsolva" : "szüneteltetve"}`,
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
    .select("id, meta_form_name, source_type")
    .maybeSingle();

  if (error || !source) return;
  const isWebsite = source.source_type === "website_form";
  await logAdminActivity({
    actorUserId: writable.actorUserId,
    description: source.meta_form_name,
    eventType: isWebsite ? "website_lead_source_removed" : "meta_lead_source_removed",
    metadata: { sourceId },
    organizationId: writable.project.organization_id,
    projectId,
    title: isWebsite ? "Weboldal űrlap leválasztva" : "Meta lead űrlap leválasztva",
  });
  revalidateMetaProject(projectId);
}

function optionalText(formData: FormData, name: string, maxLength: number) {
  const value = requiredText(formData.get(name));
  return value.length > maxLength ? null : value || undefined;
}

export async function saveLeadCallSettings(_previousState: MetaLeadSourceActionState, formData: FormData): Promise<MetaLeadSourceActionState> {
  const projectId = requiredText(formData.get("projectId"));
  const writable = await getWritableMetaProject(projectId);
  if ("error" in writable) return { error: writable.error };

  const texts = {
    calendar_id: optionalText(formData, "calendarId", 300),
    company_display_name: optionalText(formData, "companyDisplayName", 200),
    expert_name: optionalText(formData, "expertName", 200),
    expert_title: optionalText(formData, "expertTitle", 200),
    meeting_link: optionalText(formData, "meetingLink", 500),
  };
  if (Object.values(texts).some((value) => value === null)) return { error: "Valamelyik mező túl hosszú." };

  const meetingLink = texts.meeting_link;
  if (meetingLink) {
    let valid = false;
    try {
      valid = new URL(meetingLink).protocol === "https:" && meetingLink.length >= 8;
    } catch {
      valid = false;
    }
    if (!valid) return { error: "A megbeszélési link legyen érvényes https:// cím." };
  }

  const { emails, invalid } = parseNotifyEmailsInput(requiredText(formData.get("notifyEmails")));
  if (invalid.length > 0) return { error: `Érvénytelen e-mail cím: ${invalid[0]}` };
  if (emails.length > 10) return { error: "Legfeljebb 10 értesítési e-mail cím adható meg." };

  const days: Record<string, { end: string; start: string }[]> = {};
  for (const day of weekdayKeys) {
    days[day] = formData.get(`hours_${day}_on`)
      ? [{ end: requiredText(formData.get(`hours_${day}_end`)), start: requiredText(formData.get(`hours_${day}_start`)) }]
      : [];
  }
  const businessHours = normalizeBusinessHours({ days, timezone: "Europe/Budapest" });
  if (!businessHours) return { error: "A nyitvatartásnál a kezdő időpont legyen korábbi a végénél (ÓÓ:PP)." };

  const enabled = formData.get("enabled") === "on";
  const { error } = await writable.adminSupabase.from("lead_call_settings").upsert(
    {
      ...Object.fromEntries(Object.entries(texts).map(([key, value]) => [key, value ?? null])),
      business_hours: businessHours,
      enabled,
      notify_emails: emails,
      organization_id: writable.project.organization_id,
      project_id: projectId,
    },
    { onConflict: "project_id" },
  );
  if (error) {
    console.error("Lead call settings save failed", error);
    return { error: "Nem sikerült menteni a Lead Call beállításokat." };
  }

  await logAdminActivity({
    actorUserId: writable.actorUserId,
    description: enabled ? "Bekapcsolva" : "Kikapcsolva",
    eventType: "lead_call_settings_updated",
    metadata: { enabled },
    organizationId: writable.project.organization_id,
    projectId,
    title: "Lead Call beállítások frissítve",
  });
  revalidateMetaProject(projectId);
  return { success: "Lead Call beállítások mentve." };
}

export async function saveLeadSourceCampaignTopic(_previousState: MetaLeadSourceActionState, formData: FormData): Promise<MetaLeadSourceActionState> {
  const projectId = requiredText(formData.get("projectId"));
  const sourceId = requiredText(formData.get("sourceId"));
  const topic = requiredText(formData.get("campaignTopic"));
  if (!sourceId || topic.length > 200) return { error: "A kampány-téma legfeljebb 200 karakter lehet." };

  const writable = await getWritableMetaProject(projectId);
  if ("error" in writable) return { error: writable.error };

  const { data, error } = await writable.adminSupabase
    .from("lead_sources")
    .update({ campaign_topic: topic || null })
    .eq("id", sourceId)
    .eq("project_id", projectId)
    .eq("organization_id", writable.project.organization_id)
    .is("deleted_at", null)
    .select("id");
  if (error || !data?.length) return { error: "Nem sikerült menteni a kampány-témát." };

  await logAdminActivity({
    actorUserId: writable.actorUserId,
    description: topic || "Törölve",
    eventType: "lead_source_campaign_topic_updated",
    metadata: { sourceId },
    organizationId: writable.project.organization_id,
    projectId,
    title: "Kampány-téma frissítve",
  });
  revalidateMetaProject(projectId);
  return { success: "Kampány-téma mentve." };
}
