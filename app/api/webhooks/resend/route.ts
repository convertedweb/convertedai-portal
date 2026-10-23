import { verifyResendSignature } from "@/lib/resend-webhook";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Resend webhook: az email.clicked eseményt az eredeti küldés mellé naplózza (activity_logs, "email_clicked").
export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "not_configured" }, { status: 503 });
  const valid = verifyResendSignature({
    body,
    id: request.headers.get("svix-id"),
    secret,
    signature: request.headers.get("svix-signature"),
    timestamp: request.headers.get("svix-timestamp"),
  });
  if (!valid) return Response.json({ error: "unauthorized" }, { status: 401 });

  let event: { data?: { email_id?: string }; type?: string };
  try { event = JSON.parse(body); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }
  const emailId = event.data?.email_id;
  if (event.type !== "email.clicked" || !emailId) return Response.json({ ignored: true });

  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "no_admin_client" }, { status: 500 });
  const { data: sent } = await admin.from("activity_logs").select("organization_id, project_id, title").eq("event_type", "email_sent").filter("metadata->>resend_id", "eq", emailId).limit(1).maybeSingle();
  if (!sent) return Response.json({ ignored: true });
  const { data: existing } = await admin.from("activity_logs").select("id").eq("event_type", "email_clicked").filter("metadata->>resend_id", "eq", emailId).limit(1).maybeSingle();
  if (existing) return Response.json({ duplicate: true });

  const { error } = await admin.from("activity_logs").insert({
    actor_role: "system",
    event_type: "email_clicked",
    metadata: { resend_id: emailId },
    organization_id: sent.organization_id,
    project_id: sent.project_id,
    title: sent.title,
  });
  if (error) { console.error("Email click log failed", error); return Response.json({ error: "insert_failed" }, { status: 500 }); }
  return Response.json({ ok: true });
}
