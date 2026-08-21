import { NextResponse } from "next/server";
import { getCurrentAdminAccess } from "@/lib/admin-permissions";
import { getElevenLabsConversationAudio } from "@/lib/elevenlabs";
import { createClient } from "@/lib/supabase/server";

async function canAccessProject(projectId: string) {
  const adminAccess = await getCurrentAdminAccess();
  if (adminAccess.role) return true;

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return false;

  const { data: project } = await supabase
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!project?.organization_id) return false;

  const { data: membership } = await supabase
    .from("org_members")
    .select("id")
    .eq("organization_id", project.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(membership);
}

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  if (!conversationId || !projectId) {
    return NextResponse.json({ error: "Hiányzik a beszélgetés vagy projekt azonosító." }, { status: 400 });
  }

  if (!(await canAccessProject(projectId))) {
    return NextResponse.json({ error: "Nincs jogosultság a hangfájlhoz." }, { status: 403 });
  }

  const result = await getElevenLabsConversationAudio(conversationId);

  if (result.error || !result.audio) {
    return NextResponse.json({ error: "Nem sikerült beolvasni a hangfájlt." }, { status: 502 });
  }

  return new Response(result.audio, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": result.contentType ?? "audio/mpeg",
    },
  });
}
