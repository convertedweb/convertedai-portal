import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type KnowledgeUrl = { id: string; url: string; note: string | null; createdAt: string };

// A hozzáférést a belépett felhasználó saját (RLS-es) projekt-lekérdezése adja, az olvasás admin klienssel történik.
// Ha a tábla még nincs meg (migráció előtt), üres listát és available: false értéket ad.
export async function getKnowledgeUrls(projectId: string): Promise<{ urls: KnowledgeUrl[]; available: boolean }> {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id, organization_id").eq("id", projectId).is("deleted_at", null).single();
  const adminSupabase = createAdminClient();
  if (!project || !adminSupabase) return { urls: [], available: false };

  const { data, error } = await adminSupabase
    .from("knowledge_urls")
    .select("id, url, note, created_at")
    .eq("project_id", projectId)
    .eq("organization_id", project.organization_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return { urls: [], available: false };

  return { urls: (data ?? []).map((row) => ({ id: row.id, url: row.url, note: row.note, createdAt: row.created_at })), available: true };
}
