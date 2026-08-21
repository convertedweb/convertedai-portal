"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logCustomerActivity } from "@/lib/activity-log";
import { updateElevenLabsKnowledgeBaseDocument } from "@/lib/elevenlabs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type VoiceSetupState = {
  error?: string;
  success?: string;
};

export type KnowledgeUploadState = {
  error?: string;
  success?: string;
};

export type AgentKnowledgeUpdateState = {
  error?: string;
  success?: string;
};

export type PhoneDocumentUploadState = {
  error?: string;
  success?: string;
};

export type ReviewRequestState = {
  error?: string;
};

type ProjectAccessRow = {
  id: string;
  organization_id: string;
  status: string;
};

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "knowledge-file";
}

async function getAccessibleProject(projectId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "A művelethez újra be kell jelentkezni." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, organization_id, status")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  if (projectError || !project) {
    return { error: "Nem található vagy nem elérhető ez a projekt." };
  }

  return { supabase, project: project as ProjectAccessRow };
}

function parsePhoneDocumentCategory(value: FormDataEntryValue | null) {
  const category = requiredText(value);
  return ["phone_id_copy", "phone_utility_bill", "phone_company_registration"].includes(category)
    ? category
    : "";
}

export async function updateVoiceAgentSetup(_previousState: VoiceSetupState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const agentName = requiredText(formData.get("agentName"));
  const greeting = requiredText(formData.get("greeting"));
  const callInstructions = requiredText(formData.get("callInstructions"));
  const handoffInstructions = requiredText(formData.get("handoffInstructions"));

  if (!projectId || !agentName) {
    return { error: "Az agent neve kötelező." };
  }

  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };

  const { error: updateError } = await access.supabase
    .from("projects")
    .update({
      agent_display_name: agentName,
      greeting,
      call_instructions: callInstructions,
      handoff_instructions: handoffInstructions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (updateError) {
    console.error("Voice setup update failed", updateError);
    return { error: "Nem sikerült menteni az agent beállításait. Próbáld újra pár másodperc múlva." };
  }

  await logCustomerActivity({
    eventType: "voice_agent_setup_updated",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: "Voice agent beállítások módosítva",
    description: "Az ügyfél módosította az agent nevét vagy híváskezelési instrukcióit.",
    metadata: { agentName },
  });

  revalidatePath(`/portal/agents/${projectId}`);
  return { success: "Agent beállítások mentve." };
}

export async function uploadKnowledgeDocument(_previousState: KnowledgeUploadState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const file = formData.get("knowledgeFile");

  if (!projectId || !(file instanceof File) || file.size === 0) {
    return { error: "Válassz ki egy feltöltendő dokumentumot." };
  }

  if (file.size > 6 * 1024 * 1024) {
    return { error: "Első körben legfeljebb 6 MB-os fájlt tölts fel." };
  }

  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };

  const safeName = sanitizeFileName(file.name);
  const storagePath = `${projectId}/${Date.now()}-${safeName}`;
  const contentType = file.type || "application/octet-stream";

  const { error: uploadError } = await access.supabase.storage
    .from("knowledge-base")
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Knowledge upload failed", uploadError);
    return { error: "Nem sikerült feltölteni a dokumentumot. Ellenőrizd a fájltípust és próbáld újra." };
  }

  const { error: documentError } = await access.supabase
    .from("documents")
    .insert({
      organization_id: access.project.organization_id,
      project_id: projectId,
      category: "knowledge_base",
      file_name: file.name,
      storage_path: storagePath,
      mime_type: contentType,
      size_bytes: file.size,
      processing_status: "uploaded",
    });

  if (documentError) {
    console.error("Knowledge document insert failed", documentError);
    return { error: "A fájl feltöltődött, de a dokumentum rekord mentése nem sikerült." };
  }

  await logCustomerActivity({
    eventType: "knowledge_document_uploaded",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: "Tudásbázis dokumentum feltöltve",
    description: file.name,
    metadata: { fileName: file.name, fileSize: file.size, mimeType: contentType },
  });

  revalidatePath(`/portal/agents/${projectId}`);
  return { success: "Dokumentum feltöltve. Feldolgozásra vár." };
}

export async function updateAgentKnowledgeBaseDocument(_previousState: AgentKnowledgeUpdateState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const documentationId = requiredText(formData.get("documentationId"));
  const name = requiredText(formData.get("documentName"));
  const content = requiredText(formData.get("documentContent"));

  if (!projectId || !documentationId) {
    return { error: "Hiányzik a projekt vagy tudásbázis azonosító." };
  }

  if (!name || !content) {
    return { error: "A fájlnév és a tartalom nem lehet üres." };
  }

  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };

  const result = await updateElevenLabsKnowledgeBaseDocument({
    content,
    documentationId,
    name,
  });

  if (result.error) {
    console.error("Customer agent knowledge base update failed", result.rawError ?? result.error);
    return { error: "Nem sikerült feltölteni az agent tudásbázis módosításait." };
  }

  await logCustomerActivity({
    eventType: "agent_knowledge_base_updated",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: "Agent tudásbázis módosítva",
    description: name,
    metadata: { documentationId, name },
  });

  revalidatePath(`/portal/agents/${projectId}`);
  return { success: "Agent tudásbázis feltöltve." };
}

export async function uploadPhoneDocument(_previousState: PhoneDocumentUploadState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));
  const category = parsePhoneDocumentCategory(formData.get("documentCategory"));
  const file = formData.get("phoneDocument");

  if (!projectId || !category || !(file instanceof File) || file.size === 0) {
    return { error: "Válassz ki egy feltöltendő dokumentumot." };
  }

  if (file.size > 6 * 1024 * 1024) {
    return { error: "Első körben legfeljebb 6 MB-os fájlt tölts fel." };
  }

  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };

  const safeName = sanitizeFileName(file.name);
  const storagePath = `${projectId}/phone/${category}-${Date.now()}-${safeName}`;
  const contentType = file.type || "application/octet-stream";

  const { error: uploadError } = await access.supabase.storage
    .from("knowledge-base")
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Phone document upload failed", uploadError);
    return { error: "Nem sikerült feltölteni a dokumentumot. PDF, JPG, PNG vagy WEBP fájlt válassz." };
  }

  const { error: documentError } = await access.supabase
    .from("documents")
    .insert({
      organization_id: access.project.organization_id,
      project_id: projectId,
      category,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: contentType,
      size_bytes: file.size,
      processing_status: "uploaded",
    });

  if (documentError) {
    console.error("Phone document insert failed", documentError);
    return { error: "A fájl feltöltődött, de a dokumentum rekord mentése nem sikerült." };
  }

  await logCustomerActivity({
    eventType: "phone_document_uploaded",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: "Telefonszám dokumentum feltöltve",
    description: file.name,
    metadata: { category, fileName: file.name, fileSize: file.size, mimeType: contentType },
  });

  revalidatePath(`/portal/agents/${projectId}`);
  return { success: "Dokumentum feltöltve." };
}

export async function submitProjectForReview(_previousState: ReviewRequestState, formData: FormData) {
  const projectId = requiredText(formData.get("projectId"));

  if (!projectId) {
    return { error: "Hiányzik a projekt azonosító." };
  }

  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };

  if (access.project.status !== "draft") {
    return { error: "Csak előkészítés alatt álló projektet lehet ellenőrzésre küldeni." };
  }

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return { error: "Hiányzik a Supabase titkos szerveroldali kulcs. Add meg a SUPABASE_SECRET_KEY értéket a .env.local fájlban." };
  }

  const { error: updateError } = await adminSupabase
    .from("projects")
    .update({ status: "review_requested", updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("organization_id", access.project.organization_id)
    .eq("status", "draft")
    .is("deleted_at", null);

  if (updateError) {
    console.error("Project review request failed", updateError);
    return { error: "Nem sikerült ellenőrzésre küldeni a projektet. Próbáld újra pár másodperc múlva." };
  }

  await logCustomerActivity({
    eventType: "project_review_requested",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: "Projekt ellenőrzésre küldve",
    description: "Az ügyfél kérte a projekt ellenőrzését és indítási előkészítését.",
  });

  revalidatePath("/portal");
  revalidatePath("/portal/projects");
  revalidatePath(`/portal/agents/${projectId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/projects");

  redirect(`/portal/agents/${projectId}`);
}
