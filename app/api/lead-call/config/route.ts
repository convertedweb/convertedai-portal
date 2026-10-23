import { findElevenLabsPhoneNumberId } from "@/lib/elevenlabs";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkLeadCallSecret, leadCallSecretHeader } from "@/lib/lead-call-auth";
import {
  defaultBusinessHours,
  normalizeBusinessHours,
  normalizeMetaExternalId,
} from "@/lib/lead-call";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return Response.json(body, { headers: noStore, status });
}

type SourceRow = {
  campaign_topic: string | null;
  enabled: boolean;
  id: string;
  integration_connection_id: string | null;
  organization_id: string;
  project_id: string;
};

type ProjectRow = {
  category: string;
  elevenlabs_agent_id: string | null;
  id: string;
  organization_id: string;
  phone_number: string | null;
};

type SettingsRow = {
  business_hours: unknown;
  calendar_id: string | null;
  company_display_name: string | null;
  enabled: boolean;
  expert_name: string | null;
  expert_title: string | null;
  meeting_link: string | null;
  notify_emails: string[] | null;
};

// Csak az n8n hívhatja (közös titok). A válasz PII-t és titkot nem tartalmaz.
export async function GET(request: Request) {
  const auth = checkLeadCallSecret(request.headers.get(leadCallSecretHeader), process.env.LEAD_CALL_SECRET);
  if (auth === "not_configured") return json({ error: "not_configured" }, 503);
  if (auth !== "ok") return json({ error: "unauthorized" }, 401);

  const params = new URL(request.url).searchParams;
  const pageId = normalizeMetaExternalId(params.get("page_id"));
  const formId = normalizeMetaExternalId(params.get("form_id"));
  if (!pageId || !formId) return json({ error: "invalid_request" }, 400);

  const admin = createAdminClient();
  if (!admin) return json({ error: "not_configured" }, 503);

  const fail = (error: unknown) => {
    console.error("Lead call config lookup failed", error);
    return json({ error: "lookup_failed" }, 500);
  };

  // 1. Űrlap -> forrás (a Meta Form ID aktív sorokra egyedi).
  const sourceResult = await admin
    .from("lead_sources")
    .select("id, organization_id, project_id, integration_connection_id, enabled, campaign_topic")
    .eq("source_type", "meta_form")
    .eq("meta_form_id", formId)
    .is("deleted_at", null)
    .maybeSingle();
  if (sourceResult.error) return fail(sourceResult.error);
  const source = sourceResult.data as SourceRow | null;
  if (!source?.integration_connection_id) return json({ error: "not_found" }, 404);

  // 2. A forráshoz tartozó kapcsolat oldal-azonosítójának egyeznie kell a kéréssel, ugyanabban a tenantban.
  const connectionResult = await admin
    .from("integration_connections")
    .select("id, status")
    .eq("id", source.integration_connection_id)
    .eq("organization_id", source.organization_id)
    .eq("project_id", source.project_id)
    .eq("provider", "meta")
    .eq("external_resource_id", pageId)
    .is("deleted_at", null)
    .maybeSingle();
  if (connectionResult.error) return fail(connectionResult.error);
  if (!connectionResult.data) return json({ error: "not_found" }, 404);

  // 3. Projekt, szervezet és beállítások, mind tenant- és soft delete szűréssel.
  const [projectResult, organizationResult, settingsResult] = await Promise.all([
    admin
      .from("projects")
      .select("id, organization_id, category, elevenlabs_agent_id, phone_number")
      .eq("id", source.project_id)
      .eq("organization_id", source.organization_id)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("organizations")
      .select("id, status")
      .eq("id", source.organization_id)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("lead_call_settings")
      .select("enabled, company_display_name, expert_name, expert_title, notify_emails, calendar_id, meeting_link, business_hours")
      .eq("project_id", source.project_id)
      .eq("organization_id", source.organization_id)
      .maybeSingle(),
  ]);
  const lookupError = projectResult.error ?? organizationResult.error ?? settingsResult.error;
  if (lookupError) return fail(lookupError);

  const project = projectResult.data as ProjectRow | null;
  const organization = organizationResult.data as { id: string; status: string } | null;
  if (!project || !organization || project.category !== "meta_lead_caller") return json({ error: "not_found" }, 404);

  const settings = settingsResult.data as SettingsRow | null;
  const connection = connectionResult.data as { id: string; status: string };

  // A kikapcsolt állapotok 200-as választ kapnak, hogy az n8n tudja: ismert űrlap, de nem szabad hívni.
  let reason: string | null = null;
  if (!source.enabled) reason = "source_disabled";
  else if (connection.status !== "connected") reason = "connection_inactive";
  else if (organization.status === "paused" || organization.status === "churned") reason = "organization_inactive";
  else if (!settings) reason = "settings_missing";
  else if (!settings.enabled) reason = "project_disabled";
  else if (!project.elevenlabs_agent_id) reason = "agent_missing";
  else if (!project.phone_number?.trim()) reason = "phone_number_missing";
  else if (!settings.calendar_id) reason = "calendar_missing";
  if (reason || !settings) return json({ enabled: false, reason });

  // A kimenő hívó szám a projekt Telefon fülén megadott szám; az ElevenLabs azonosítóját innen oldjuk fel.
  const phoneNumber = project.phone_number!.trim();
  const phoneNumberId = await findElevenLabsPhoneNumberId(phoneNumber).catch(() => null);
  if (!phoneNumberId) return json({ enabled: false, reason: "phone_number_not_in_elevenlabs" });

  return json({
    agent_id: project.elevenlabs_agent_id,
    business_hours: normalizeBusinessHours(settings.business_hours) ?? defaultBusinessHours,
    calendar_id: settings.calendar_id,
    campaign_topic: source.campaign_topic,
    company_display_name: settings.company_display_name,
    enabled: true,
    expert_name: settings.expert_name,
    expert_title: settings.expert_title,
    meeting_link: settings.meeting_link,
    notify_emails: settings.notify_emails ?? [],
    organization_id: project.organization_id,
    phone_number: phoneNumber,
    phone_number_id: phoneNumberId,
    project_id: project.id,
    source_id: source.id,
  });
}
