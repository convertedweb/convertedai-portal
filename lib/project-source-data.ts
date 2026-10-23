import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSourceDocumentCategory, type SourceLinkKind } from "@/lib/project-sources";

export type ProjectSourceLink = {
  id: string;
  kind: SourceLinkKind;
  title: string;
  url: string;
  createdAt: string;
};

export type ProjectSourceData = {
  links: ProjectSourceLink[];
  linksAvailable: boolean;
  documentUrls: Record<string, string>;
};

export async function getProjectSourceData(projectId: string): Promise<ProjectSourceData> {
  const empty: ProjectSourceData = { links: [], linksAvailable: false, documentUrls: {} };
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return empty;

  const [linksResult, documentsResult] = await Promise.all([
    supabase.from("project_source_links")
      .select("id, kind, title, url, created_at")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("documents")
      .select("id, category, storage_path")
      .eq("project_id", projectId)
      .is("deleted_at", null),
  ]);

  const signer = createAdminClient() ?? supabase;
  const sourceDocuments = (documentsResult.data ?? []).filter((document) => isSourceDocumentCategory(document.category));
  const signedDocuments = await Promise.all(sourceDocuments.map(async (document) => {
    const { data, error } = await signer.storage.from("knowledge-base").createSignedUrl(document.storage_path, 600);
    return [document.id, error ? "" : data?.signedUrl ?? ""] as const;
  }));

  return {
    links: (linksResult.data ?? []).map((link) => ({
      id: link.id,
      kind: link.kind as SourceLinkKind,
      title: link.title,
      url: link.url,
      createdAt: link.created_at,
    })),
    linksAvailable: !linksResult.error,
    documentUrls: Object.fromEntries(signedDocuments.filter(([, url]) => url)),
  };
}
