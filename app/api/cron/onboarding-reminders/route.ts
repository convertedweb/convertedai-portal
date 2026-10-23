import { getSiteUrl, getUsersByIds, sendNotificationEmail } from "@/lib/email-notifications";
import { checkLeadCallSecret } from "@/lib/lead-call-auth";
import { resolveAssistantFields } from "@/lib/onboarding-fields";
import { resolveOnboardingAccounts } from "@/lib/onboarding-accounts";
import { buildReminderEmail, daysSince, isReminderDay, missingOnboardingItems, onboardingDeadlineDays } from "@/lib/onboarding-reminders";
import { isDesignProject } from "@/lib/project-sources";
import type { Project } from "@/lib/project-types";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const splitList = (value: string | undefined) => (value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);

// Napi cron hívja (x-cron-secret fejléc). Az ONBOARDING_REMINDER_PROJECT_IDS listán szereplő projektekre küld (a * minden draft hangasszisztens projektet jelent; üresen nem küld);
// az ONBOARDING_REMINDER_EMAILS (ha meg van adva) tovább szűri a címzetteket. ?dry=1: nem küld, ?force=1: a napi ütemtől függetlenül küld.
async function run(request: Request) {
  const auth = checkLeadCallSecret(request.headers.get("x-cron-secret"), process.env.CRON_SECRET);
  if (auth !== "ok") return Response.json({ error: auth }, { status: auth === "not_configured" ? 503 : 401 });

  const url = new URL(request.url);
  const dry = url.searchParams.get("dry") === "1";
  const force = url.searchParams.get("force") === "1";
  const projectIds = splitList(process.env.ONBOARDING_REMINDER_PROJECT_IDS);
  const emailFilter = splitList(process.env.ONBOARDING_REMINDER_EMAILS);
  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "no_admin_client" }, { status: 500 });
  if (!projectIds.length) return Response.json({ results: [] });
  const allProjects = projectIds.includes("*");

  let query = admin
    .from("projects")
    .select("id, organization_id, name, category, status, created_at, planned_launch_date, phone_request_type, phone_owner_type, phone_documents_received, knowledge_assets_received, agent_display_name, greeting, call_instructions, handoff_instructions, onboarding_accounts, onboarding_accounts_done, onboarding_field_config")
    .eq("status", "draft")
    .is("deleted_at", null);
  if (!allProjects) query = query.in("id", projectIds);
  const { data: rows, error } = await query;
  // A design/weboldal projekteknek nincs ilyen onboardingjuk.
  const projects = (rows ?? []).filter((row) => !isDesignProject(row.category));
  if (error) return Response.json({ error: "query_failed" }, { status: 500 });

  const results: { project: string; sent: number; reason?: string; missing?: string[] }[] = [];
  for (const row of projects) {
    const start = (row.planned_launch_date as string | null) ?? (row.created_at as string);
    if (!force && !isReminderDay(start)) { results.push({ project: row.id, sent: 0, reason: "not_reminder_day" }); continue; }

    const [{ data: docs }, { count: urlCount }, { data: members }] = await Promise.all([
      admin.from("documents").select("category").eq("project_id", row.id).is("deleted_at", null),
      admin.from("knowledge_urls").select("id", { count: "exact", head: true }).eq("project_id", row.id).eq("organization_id", row.organization_id).is("deleted_at", null),
      admin.from("org_members").select("user_id").eq("organization_id", row.organization_id),
    ]);
    const project = {
      category: row.category,
      phoneRequestType: row.phone_request_type,
      phoneOwnerType: row.phone_owner_type,
      phoneDocumentsReceived: row.phone_documents_received,
      knowledgeAssetsReceived: row.knowledge_assets_received,
      agentDisplayName: row.agent_display_name ?? "Nincs megadva",
      greeting: row.greeting ?? "",
      callInstructions: row.call_instructions ?? "",
      handoffInstructions: row.handoff_instructions ?? "",
      documentList: docs ?? [],
    } as unknown as Project;
    const accounts = resolveOnboardingAccounts(row.onboarding_accounts, row.onboarding_accounts_done ?? []);
    const stored = Array.isArray(row.onboarding_field_config?.assistant) ? (row.onboarding_field_config.assistant as string[]) : null;
    const missing = missingOnboardingItems(project, accounts.every((account) => account.done), resolveAssistantFields(stored), urlCount ?? 0);
    if (!missing.length) { results.push({ project: row.id, sent: 0, reason: "complete" }); continue; }

    let recipients = await getUsersByIds(admin, (members ?? []).map((member) => member.user_id as string));
    if (emailFilter.length) recipients = recipients.filter((recipient) => emailFilter.includes(recipient.email.toLowerCase()));
    if (!recipients.length) { results.push({ project: row.id, sent: 0, reason: "no_recipients", missing }); continue; }
    if (dry) { results.push({ project: row.id, sent: 0, reason: "dry_run", missing }); continue; }

    const email = buildReminderEmail({ daysLeft: onboardingDeadlineDays - daysSince(start), items: missing, projectName: row.name, url: `${getSiteUrl()}/portal/projects/${row.id}/onboarding` });
    const { sent } = await sendNotificationEmail({ ...email, record: { organizationId: row.organization_id, projectId: row.id }, to: recipients });
    results.push({ project: row.id, sent: sent ? recipients.length : 0, missing });
  }
  return Response.json({ results });
}

export const GET = run;
export const POST = run;
