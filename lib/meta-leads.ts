import { createClient } from "@/lib/supabase/server";
import type { LeadSourceType } from "@/lib/lead-sources";

export type MetaLeadSource = {
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

export type MetaLeadSourcesResult = {
  available: boolean;
  connection: MetaPageConnection | null;
  sources: MetaLeadSource[];
};

export async function getMetaLeadSources(projectId: string): Promise<MetaLeadSourcesResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { available: true, connection: null, sources: [] };

  const [connectionResult, sourcesResult] = await Promise.all([
    supabase
      .from("integration_connections")
      .select("id, status, external_resource_id, external_resource_name")
      .eq("project_id", projectId)
      .eq("provider", "meta")
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("lead_sources")
      .select("id, source_type, meta_form_id, meta_form_name, website_url, enabled, last_test_lead_at, last_lead_received_at, created_at")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const lookupError = connectionResult.error ?? sourcesResult.error;
  if (lookupError) {
    const unavailable = lookupError.code === "42P01" || lookupError.code === "42703" || /integration_connections|lead_sources/i.test(lookupError.message);
    if (!unavailable) console.error("Meta lead source lookup failed", lookupError);
    return { available: !unavailable, connection: null, sources: [] };
  }

  const connectionRow = connectionResult.data as MetaPageConnectionRow | null;

  return {
    available: true,
    connection: connectionRow?.external_resource_id && connectionRow.external_resource_name ? {
      id: connectionRow.id,
      pageId: connectionRow.external_resource_id,
      pageName: connectionRow.external_resource_name,
      status: connectionRow.status,
    } : null,
    sources: ((sourcesResult.data ?? []) as MetaLeadSourceRow[]).map((source) => ({
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
