import { createAdminClient } from "@/lib/supabase/admin";
import { checkLeadCallSecret, leadCallSecretHeader } from "@/lib/lead-call-auth";
import {
  isLeadCallEventStatus,
  isLeadIdHash,
  isStopStatus,
  isUuid,
  maxLeadCallAttempts,
  type LeadCallEventStatus,
} from "@/lib/lead-call";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

type EventRow = {
  attempts: number;
  booked: boolean;
  conversation_id: string | null;
  created_at: string;
  status: LeadCallEventStatus;
  updated_at: string;
};

const eventColumns = "status, attempts, conversation_id, booked, created_at, updated_at";

function json(body: unknown, status = 200) {
  return Response.json(body, { headers: { "Cache-Control": "no-store" }, status });
}

function serialize(row: EventRow) {
  return {
    attempts: row.attempts,
    booked: row.booked,
    conversation_id: row.conversation_id,
    created_at: row.created_at,
    status: row.status,
    stop: isStopStatus(row.status),
    updated_at: row.updated_at,
  };
}

function authorize(request: Request) {
  const auth = checkLeadCallSecret(request.headers.get(leadCallSecretHeader), process.env.LEAD_CALL_SECRET);
  if (auth === "not_configured") return json({ error: "not_configured" }, 503);
  if (auth !== "ok") return json({ error: "unauthorized" }, 401);
  return null;
}

// A szervezetet mindig a projektből vezetjük le; a hívó által küldött organization_id-t nem fogadjuk el.
async function resolveProjectOrganization(admin: AdminClient, projectId: string) {
  const { data: project, error } = await admin
    .from("projects")
    .select("id, organization_id")
    .eq("id", projectId)
    .eq("category", "meta_lead_caller")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!project) return null;

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id")
    .eq("id", project.organization_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (organizationError) throw organizationError;
  return organization ? (project.organization_id as string) : null;
}

async function readBody(request: Request) {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function readEvent(admin: AdminClient, organizationId: string, projectId: string, leadIdHash: string) {
  const { data, error } = await admin
    .from("lead_call_events")
    .select(eventColumns)
    .eq("organization_id", organizationId)
    .eq("project_id", projectId)
    .eq("lead_id_hash", leadIdHash)
    .maybeSingle();
  if (error) throw error;
  return data as EventRow | null;
}

// Duplikáció- és stop-ellenőrzés: GET ?project_id=…&lead_id_hash=…
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const projectId = params.get("project_id");
  const leadIdHash = params.get("lead_id_hash");
  if (!isUuid(projectId) || !isLeadIdHash(leadIdHash)) return json({ error: "invalid_request" }, 400);

  const admin = createAdminClient();
  if (!admin) return json({ error: "not_configured" }, 503);

  try {
    const organizationId = await resolveProjectOrganization(admin, projectId);
    if (!organizationId) return json({ error: "not_found" }, 404);
    const event = await readEvent(admin, organizationId, projectId, leadIdHash);
    return json(event ? { found: true, ...serialize(event) } : { found: false, stop: false });
  } catch (error) {
    console.error("Lead call event lookup failed", error);
    return json({ error: "lookup_failed" }, 500);
  }
}

// Lead "lefoglalása": az első hívás létrehozza a sort (created: true), minden további duplikáció (created: false).
export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const body = await readBody(request);
  if (!body || !isUuid(body.project_id) || !isLeadIdHash(body.lead_id_hash)) return json({ error: "invalid_request" }, 400);

  const admin = createAdminClient();
  if (!admin) return json({ error: "not_configured" }, 503);

  try {
    const organizationId = await resolveProjectOrganization(admin, body.project_id);
    if (!organizationId) return json({ error: "not_found" }, 404);

    const { data: inserted, error } = await admin
      .from("lead_call_events")
      .upsert(
        { lead_id_hash: body.lead_id_hash, organization_id: organizationId, project_id: body.project_id },
        { ignoreDuplicates: true, onConflict: "project_id,lead_id_hash" },
      )
      .select(eventColumns);
    if (error) throw error;

    if (inserted && inserted.length > 0) {
      return json({ created: true, ...serialize(inserted[0] as EventRow) }, 201);
    }
    const existing = await readEvent(admin, organizationId, body.project_id, body.lead_id_hash);
    if (!existing) return json({ error: "lookup_failed" }, 500);
    return json({ created: false, ...serialize(existing) });
  } catch (error) {
    console.error("Lead call event claim failed", error);
    return json({ error: "write_failed" }, 500);
  }
}

// Állapotfrissítés: status, attempts (csak növelhető), conversation_id, booked.
export async function PATCH(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const body = await readBody(request);
  if (!body || !isUuid(body.project_id) || !isLeadIdHash(body.lead_id_hash)) return json({ error: "invalid_request" }, 400);

  const update: { attempts?: number; booked?: boolean; conversation_id?: string; status?: LeadCallEventStatus } = {};
  if (body.status !== undefined) {
    if (!isLeadCallEventStatus(body.status)) return json({ error: "invalid_request" }, 400);
    update.status = body.status;
  }
  if (body.attempts !== undefined) {
    if (typeof body.attempts !== "number" || !Number.isInteger(body.attempts) || body.attempts < 0 || body.attempts > maxLeadCallAttempts) {
      return json({ error: "invalid_request" }, 400);
    }
    update.attempts = body.attempts;
  }
  if (body.conversation_id !== undefined) {
    if (typeof body.conversation_id !== "string" || body.conversation_id.length < 1 || body.conversation_id.length > 200) {
      return json({ error: "invalid_request" }, 400);
    }
    update.conversation_id = body.conversation_id;
  }
  if (body.booked !== undefined) {
    if (typeof body.booked !== "boolean") return json({ error: "invalid_request" }, 400);
    update.booked = body.booked;
  }
  if (Object.keys(update).length === 0) return json({ error: "invalid_request" }, 400);

  const admin = createAdminClient();
  if (!admin) return json({ error: "not_configured" }, 503);

  try {
    const organizationId = await resolveProjectOrganization(admin, body.project_id);
    if (!organizationId) return json({ error: "not_found" }, 404);

    const current = await readEvent(admin, organizationId, body.project_id, body.lead_id_hash);
    if (!current) return json({ error: "not_found" }, 404);
    // A próbálkozásszám nem csökkenhet; a lezárt (stop) állapotból nincs visszalépés, és a foglalás sem vonható vissza.
    if (update.attempts !== undefined) update.attempts = Math.max(update.attempts, current.attempts);
    if (update.status && isStopStatus(current.status) && update.status !== current.status) delete update.status;
    if (update.booked === false && current.booked) delete update.booked;
    // Ha a védelmek minden mezőt kiejtettek, nincs mit írni: a jelenlegi állapotot adjuk vissza.
    if (Object.keys(update).length === 0) return json(serialize(current));

    const { data, error } = await admin
      .from("lead_call_events")
      .update(update)
      .eq("organization_id", organizationId)
      .eq("project_id", body.project_id)
      .eq("lead_id_hash", body.lead_id_hash)
      .select(eventColumns)
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "not_found" }, 404);
    return json(serialize(data as EventRow));
  } catch (error) {
    console.error("Lead call event update failed", error);
    return json({ error: "write_failed" }, 500);
  }
}
