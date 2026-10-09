import { createClient } from "@/lib/supabase/server";
import type { LeadSourceType } from "@/lib/lead-sources";
import { defaultBusinessHours, normalizeBusinessHours, type BusinessHours } from "@/lib/lead-call";

export type MetaLeadSource = {
  campaignTopic: string | null;
  createdAt: string;
  enabled: boolean;
  id: string;
  lastLeadReceivedAt: string | null;
  lastTestLeadAt: string | null;
  formId: string | null;
  formName: string;
  sourceType: LeadSourceType;
  websiteUrl: string | null;
};

type MetaLeadSourceRow = {
  campaign_topic: string | null;
  created_at: string;
  enabled: boolean;
  id: string;
  last_lead_received_at: string | null;
  last_test_lead_at: string | null;
  meta_form_id: string | null;
  meta_form_name: string;
  source_type: LeadSourceType;
  website_url: string | null;
};

export type MetaPageConnection = {
  id: string;
  pageId: string;
  pageName: string;
  status: "pending" | "connected" | "attention_required" | "revoked";
};

type MetaPageConnectionRow = {
  external_resource_id: string | null;
  external_resource_name: string | null;
  id: string;
  status: MetaPageConnection["status"];
};

export type LeadCallSettings = {
  businessHours: BusinessHours;
  calendarId: string;
  companyDisplayName: string;
  enabled: boolean;
  expertName: string;
  expertTitle: string;
  meetingLink: string;
  notifyEmails: string[];
};

type LeadCallSettingsRow = {
  business_hours: unknown;
  calendar_id: string | null;
  company_display_name: string | null;
  enabled: boolean;
  expert_name: string | null;
  expert_title: string | null;
  meeting_link: string | null;
  notify_emails: string[] | null;
};

export type MetaLeadSourcesResult = {
  available: boolean;
  settings: LeadCallSettings | null;
  connection: MetaPageConnection | null;
  sources: MetaLeadSource[];
};

export async function getMetaLeadSources(projectId: string): Promise<MetaLeadSourcesResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { available: true, connection: null, settings: null, sources: [] };

  const [connectionResult, sourcesResult, settingsResult] = await Promise.all([
    supabase
      .from("integration_connections")
      .select("id, status, external_resource_id, external_resource_name")
      .eq("project_id", projectId)
      .eq("provider", "meta")
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("lead_sources")
      .select("id, source_type, campaign_topic, meta_form_id, meta_form_name, website_url, enabled, last_test_lead_at, last_lead_received_at, created_at")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_call_settings")
      .select("enabled, company_display_name, expert_name, expert_title, notify_emails, calendar_id, meeting_link, business_hours")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  const lookupError = connectionResult.error ?? sourcesResult.error ?? settingsResult.error;
  if (lookupError) {
    const unavailable = lookupError.code === "42P01" || lookupError.code === "42703" || /integration_connections|lead_sources|lead_call_settings/i.test(lookupError.message);
    if (!unavailable) console.error("Meta lead source lookup failed", lookupError);
    return { available: !unavailable, connection: null, settings: null, sources: [] };
  }

  const connectionRow = connectionResult.data as MetaPageConnectionRow | null;
  const settingsRow = settingsResult.data as LeadCallSettingsRow | null;

  return {
    available: true,
    settings: settingsRow ? {
      businessHours: normalizeBusinessHours(settingsRow.business_hours) ?? defaultBusinessHours,
      calendarId: settingsRow.calendar_id ?? "",
      companyDisplayName: settingsRow.company_display_name ?? "",
      enabled: settingsRow.enabled,
      expertName: settingsRow.expert_name ?? "",
      expertTitle: settingsRow.expert_title ?? "",
      meetingLink: settingsRow.meeting_link ?? "",
      notifyEmails: settingsRow.notify_emails ?? [],
    } : null,
    connection: connectionRow?.external_resource_id && connectionRow.external_resource_name ? {
      id: connectionRow.id,
      pageId: connectionRow.external_resource_id,
      pageName: connectionRow.external_resource_name,
      status: connectionRow.status,
    } : null,
    sources: ((sourcesResult.data ?? []) as MetaLeadSourceRow[]).map((source) => ({
      campaignTopic: source.campaign_topic,
      createdAt: source.created_at,
      enabled: source.enabled,
      formId: source.meta_form_id,
      formName: source.meta_form_name,
      id: source.id,
      lastLeadReceivedAt: source.last_lead_received_at,
      lastTestLeadAt: source.last_test_lead_at,
      sourceType: source.source_type,
      websiteUrl: source.website_url,
    })),
  };
}
