"use server";

import { revalidatePath } from "next/cache";
import { canManageProjects, getCurrentAdminAccess } from "@/lib/admin-permissions";
import { logAdminActivity, logCustomerActivity } from "@/lib/activity-log";
import { isDesignProject, isSourceDocumentCategory, isSourceLinkKind, normalizeSourceLinkUrl } from "@/lib/project-sources";
import type { ProjectCategory } from "@/lib/project-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ProjectSourceActionState = { error?: string; success?: string };

const acceptedFileTypes: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"],
  ".csv": ["text/csv", "text/plain"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
};

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function getWritableProject(projectId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "A művelethez újra be kell jelentkezni." } as const;

  const { data: project, error: projectError } = await supabase.from("projects")
    .select("id, organization_id, category")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();
  if (projectError || !project || !isDesignProject(project.category as ProjectCategory)) {
    return { error: "Nem található szerkeszthető design projekt." } as const;
  }

  const { data: membership } = await supabase.from("org_members")
    .select("organization_id")
    .eq("organization_id", project.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership) return { supabase, writer: supabase, project, user, isAdmin: false } as const;

  const adminAccess = await getCurrentAdminAccess();
  if (adminAccess.user?.id !== user.id || !canManageProjects(adminAccess.role)) {
    return { error: "Nincs jogosultságod a projekt forrásainak módosításához." } as const;
  }

  const adminClient = createAdminClient();
  if (!adminClient) return { error: "A projekt forrásai jelenleg nem módosíthatók." } as const;
  return { supabase, writer: adminClient, project, user, isAdmin: true } as const;
}

async function logSourceActivity(
  access: Exclude<Awaited<ReturnType<typeof getWritableProject>>, { error: string }>,
  eventType: string,
  title: string,
  description: string,
) {
  const input = {
    eventType,
    organizationId: access.project.organization_id,
    projectId: access.project.id,
    title,
    description,
  };
  if (access.isAdmin) {
    await logAdminActivity({ ...input, actorUserId: access.user.id });
  } else {
    await logCustomerActivity({ ...input, supabase: access.supabase });
  }
}

export async function uploadProjectSourceDocument(_previousState: ProjectSourceActionState, formData: FormData): Promise<ProjectSourceActionState> {
  const projectId = requiredText(formData.get("projectId"));
  const category = requiredText(formData.get("category"));
  const file = formData.get("sourceFile");
  if (!projectId || !isSourceDocumentCategory(category) || !(file instanceof File) || file.size === 0) {
    return { error: "Válassz dokumentumtípust és feltöltendő fájlt." };
  }
  if (file.size > 6 * 1024 * 1024) return { error: "A fájl legfeljebb 6 MB lehet." };

  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  const allowedTypes = acceptedFileTypes[extension];
  if (!allowedTypes?.includes(file.type)) return { error: "PDF, DOCX, DOC, TXT, MD, CSV, JPG, PNG vagy WEBP fájlt válassz." };

  const access = await getWritableProject(projectId);
  if ("error" in access) return { error: access.error };
  if (category === "design_source_research" && access.project.category !== "ui_ux_design") return { error: "Ez a dokumentumtípus csak UI/UX projekthez használható." };
  if (category === "design_source_content" && access.project.category !== "website") return { error: "Ez a dokumentumtípus csak weboldal projekthez használható." };

  const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "source-file";
  const storagePath = `${projectId}/design/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await access.writer.storage.from("knowledge-base")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("Project source file upload failed", uploadError);
    return { error: "Nem sikerült feltölteni a fájlt." };
  }

  const { error: documentError } = await access.writer.from("documents").insert({
    organization_id: access.project.organization_id,
    project_id: projectId,
    category,
    file_name: file.name.slice(0, 250),
    storage_path: storagePath,
    mime_type: file.type,
    size_bytes: file.size,
    processing_status: "ready",
  });
  if (documentError) {
    console.error("Project source document insert failed", documentError);
    await access.writer.storage.from("knowledge-base").remove([storagePath]);
    return { error: "Nem sikerült menteni a dokumentumot." };
  }

  await logSourceActivity(access, "project_source_document_uploaded", "Projekt forrásdokumentum feltöltve", file.name);
  revalidatePath(`/portal/agents/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
  return { success: "Dokumentum feltöltve." };
}

export async function addProjectSourceLink(_previousState: ProjectSourceActionState, formData: FormData): Promise<ProjectSourceActionState> {
  const projectId = requiredText(formData.get("projectId"));
  const kind = requiredText(formData.get("kind"));
  const title = requiredText(formData.get("title"));
  const url = normalizeSourceLinkUrl(requiredText(formData.get("url")));
  if (!projectId || !isSourceLinkKind(kind) || !title || title.length > 200 || !url) {
    return { error: "Adj meg egy típust, címet és érvényes http vagy https linket." };
  }

  const access = await getWritableProject(projectId);
  if ("error" in access) return { error: access.error };
  const { error } = await access.writer.from("project_source_links").insert({
    organization_id: access.project.organization_id,
    project_id: projectId,
    kind,
    title,
    url,
  });
  if (error) {
    console.error("Project source link insert failed", error);
    return { error: "Nem sikerült menteni a linket. Lehet, hogy a forráslinkek még nem érhetők el." };
  }

  await logSourceActivity(access, "project_source_link_added", "Projekt forráslink hozzáadva", title);
  revalidatePath(`/portal/agents/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
  return { success: "Link hozzáadva." };
}

export async function removeProjectSourceLink(_previousState: ProjectSourceActionState, formData: FormData): Promise<ProjectSourceActionState> {
  const projectId = requiredText(formData.get("projectId"));
  const linkId = requiredText(formData.get("linkId"));
  if (!projectId || !linkId) return { error: "Hiányzik a projekt vagy a link azonosítója." };

  const access = await getWritableProject(projectId);
  if ("error" in access) return { error: access.error };
  const { data: link, error: lookupError } = await access.writer.from("project_source_links")
    .select("title")
    .eq("id", linkId)
    .eq("project_id", projectId)
    .eq("organization_id", access.project.organization_id)
    .is("deleted_at", null)
    .single();
  if (lookupError || !link) return { error: "Nem található ez a forráslink." };

  const { count, error } = await access.writer.from("project_source_links")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", linkId)
    .eq("project_id", projectId)
    .eq("organization_id", access.project.organization_id)
    .is("deleted_at", null);
  if (error || count !== 1) return { error: "Nem sikerült eltávolítani a linket." };

  await logSourceActivity(access, "project_source_link_removed", "Projekt forráslink eltávolítva", link.title);
  revalidatePath(`/portal/agents/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
  return { success: "Link eltávolítva." };
}
