"use server";

import { redirect } from "next/navigation";
import { logCustomerActivity } from "@/lib/activity-log";
import type { PhoneRequestType, ProjectCategory } from "@/lib/project-types";
import { createClient } from "@/lib/supabase/server";

export type CreateProjectState = {
  error?: string;
};

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCategory(value: FormDataEntryValue | null): ProjectCategory {
  return value === "chatbot" || value === "automation" || value === "voice_agent" ? value : "voice_agent";
}

function parsePhoneRequestType(category: ProjectCategory, value: string): PhoneRequestType | null {
  if (category !== "voice_agent") return null;
  if (value === "local_company" || value === "local_private") return value;
  return "hu_21";
}

function parseOptionalUrl(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatProjectName(companyName: string, projectName: string) {
  const prefix = `${companyName} - `;
  return projectName.startsWith(prefix) ? projectName : `${prefix}${projectName}`;
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "phone-document";
}

function getUploadFile(formData: FormData, name: string) {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
}

function validatePhoneFile(file: File | null) {
  if (!file) return "Válassz ki minden szükséges telefonszám dokumentumot.";
  if (file.size > 6 * 1024 * 1024) return "Első körben legfeljebb 6 MB-os fájlt tölts fel.";
  return null;
}

function validateKnowledgeFile(file: File) {
  if (file.size > 20 * 1024 * 1024) return "A tudásbázis fájlok egyenként legfeljebb 20 MB méretűek lehetnek.";
  return null;
}

async function uploadPhoneDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  projectId: string,
  category: string,
  file: File,
) {
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${projectId}/phone/${category}-${Date.now()}-${safeName}`;
  const contentType = file.type || "application/octet-stream";

  const { error: uploadError } = await supabase.storage
    .from("knowledge-base")
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Project creation phone document upload failed", uploadError);
    return "Nem sikerült feltölteni a telefonszám dokumentumot. PDF, JPG, PNG vagy WEBP fájlt válassz.";
  }

  const { error: documentError } = await supabase
    .from("documents")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      category,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: contentType,
      size_bytes: file.size,
      processing_status: "uploaded",
    });

  if (documentError) {
    console.error("Project creation phone document insert failed", documentError);
    return "A fájl feltöltődött, de a dokumentum rekord mentése nem sikerült.";
  }

  return null;
}

async function uploadProjectDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  projectId: string,
  file: File,
  category: string,
  folder = "knowledge",
) {
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${projectId}/${folder}/${Date.now()}-${safeName}`;
  const contentType = file.type || "application/octet-stream";

  const { error: uploadError } = await supabase.storage
    .from("knowledge-base")
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Project creation document upload failed", uploadError);
    return "Nem sikerült feltölteni a fájlt. Ellenőrizd a fájltípust és próbáld újra.";
  }

  const { error: documentError } = await supabase
    .from("documents")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      category,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: contentType,
      size_bytes: file.size,
      processing_status: "uploaded",
    });

  if (documentError) {
    console.error("Project creation document insert failed", documentError);
    return "A fájl feltöltődött, de a dokumentum rekord mentése nem sikerült.";
  }

  return null;
}

export async function createProject(_previousState: CreateProjectState, formData: FormData) {
  const projectName = requiredText(formData.get("projectName"));
  const agentName = requiredText(formData.get("agentName"));
  const agentLanguage = requiredText(formData.get("agentLanguage")) || "hu";
  const agentStyle = requiredText(formData.get("agentStyle")) || "receptionist";
  const agentTone = requiredText(formData.get("agentTone")) || "friendly";
  const greeting = requiredText(formData.get("greeting"));
  const callInstructions = requiredText(formData.get("callInstructions"));
  const handoffInstructions = requiredText(formData.get("handoffInstructions"));
  const category = parseCategory(formData.get("category"));
  const phonePreference = requiredText(formData.get("phonePreference"));
  const googleAccountEmail = requiredText(formData.get("googleAccountEmail"));
  const googlePasswordShareUrl = requiredText(formData.get("googlePasswordShareUrl"));
  const wantsGoogleAccess = Boolean(googleAccountEmail || googlePasswordShareUrl);
  const parsedGooglePasswordShareUrl = parseOptionalUrl(googlePasswordShareUrl);
  const phoneRequestType = parsePhoneRequestType(category, phonePreference);
  const requiresAgentName = category !== "automation";
  const wantsLocalPhone = category === "voice_agent" && phonePreference.startsWith("local");
  const companyRegistrationFile = getUploadFile(formData, "phoneCompanyRegistration");
  const utilityBillFile = getUploadFile(formData, "phoneUtilityBill");
  const idCopyFile = getUploadFile(formData, "phoneIdCopy");
  const promptInstructionsFile = getUploadFile(formData, "promptInstructionsFile");
  const handoffInstructionsFile = getUploadFile(formData, "handoffInstructionsFile");
  const knowledgeFiles = formData
    .getAll("knowledgeFiles")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (!projectName || (requiresAgentName && !agentName)) {
    return { error: requiresAgentName ? "Adja meg a projekt nevét és a megjelenített nevet." : "Adja meg a projekt nevét." };
  }

  const knowledgeFileError = knowledgeFiles.map(validateKnowledgeFile).find(Boolean);
  if (knowledgeFileError) return { error: knowledgeFileError };
  const promptFileError = [promptInstructionsFile, handoffInstructionsFile]
    .filter((file): file is File => Boolean(file))
    .map(validateKnowledgeFile)
    .find(Boolean);
  if (promptFileError) return { error: promptFileError };

  if (wantsLocalPhone) {
    const requiredFiles = phonePreference === "local_company"
      ? [companyRegistrationFile, utilityBillFile]
      : [idCopyFile, utilityBillFile];
    const fileError = requiredFiles.map(validatePhoneFile).find(Boolean);
    if (fileError) return { error: fileError };
  }

  if (wantsGoogleAccess) {
    if (!googleAccountEmail.includes("@")) {
      return { error: "Adj meg egy érvényes Google technikai fiók e-mail címet." };
    }

    if (!parsedGooglePasswordShareUrl) {
      return { error: "A jelszóátadáshoz https kezdetű biztonságos megosztási linket adj meg." };
    }

  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "A projekt létrehozásához újra be kell jelentkezni." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (membershipError || !membership) {
    console.error("Project creation membership lookup failed", membershipError);
    return { error: "Nincs organization hozzáférés ehhez a fiókhoz." };
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("name, company_name")
    .eq("id", membership.organization_id)
    .is("deleted_at", null)
    .single();

  const companyName = organization?.company_name ?? organization?.name;

  if (organizationError || !companyName) {
    console.error("Project creation organization lookup failed", organizationError);
    return { error: "Nem található a cég neve ehhez a fiókhoz." };
  }

  const fullProjectName = formatProjectName(companyName, projectName);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      organization_id: membership.organization_id,
      name: fullProjectName,
      agent_display_name: requiresAgentName ? agentName : null,
      category,
      phone_number: null,
      phone_request_type: phoneRequestType,
      google_account_email: wantsGoogleAccess ? googleAccountEmail : null,
      google_password_share_url: wantsGoogleAccess ? parsedGooglePasswordShareUrl : null,
      google_access_confirmed: wantsGoogleAccess,
      google_access_status: wantsGoogleAccess ? "submitted" : "not_provided",
      agent_language: agentLanguage,
      agent_style: agentStyle,
      agent_tone: agentTone,
      greeting,
      call_instructions: callInstructions,
      handoff_instructions: handoffInstructions,
      telnyx_status: category === "voice_agent" ? "requested" : "pending",
      status: "draft",
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Project creation insert failed", projectError);
    const permissionError = projectError?.code === "42501" || projectError?.message?.toLowerCase().includes("row-level security");
    return {
      error: permissionError
        ? "A Supabase nem engedi az új projekt létrehozását. Futtasd le a 0003_project_creation.sql migrációt."
        : "Nem sikerült létrehozni a projektet. Próbáld újra pár másodperc múlva.",
    };
  }

  if (wantsLocalPhone) {
    const documentUploads = phonePreference === "local_company"
      ? [
          ["phone_company_registration", companyRegistrationFile],
          ["phone_utility_bill", utilityBillFile],
        ] as const
      : [
          ["phone_id_copy", idCopyFile],
          ["phone_utility_bill", utilityBillFile],
        ] as const;

    for (const [documentCategory, file] of documentUploads) {
      if (!file) return { error: "A projekt létrejött, de hiányzik egy telefonszám dokumentum." };
      const uploadError = await uploadPhoneDocument(supabase, membership.organization_id, project.id, documentCategory, file);
      if (uploadError) return { error: uploadError };
    }
  }

  for (const file of knowledgeFiles) {
    const uploadError = await uploadProjectDocument(supabase, membership.organization_id, project.id, file, "knowledge_base", "knowledge");
    if (uploadError) return { error: uploadError };
  }

  if (promptInstructionsFile) {
    const uploadError = await uploadProjectDocument(supabase, membership.organization_id, project.id, promptInstructionsFile, "prompt_instructions", "prompt");
    if (uploadError) return { error: uploadError };
  }

  if (handoffInstructionsFile) {
    const uploadError = await uploadProjectDocument(supabase, membership.organization_id, project.id, handoffInstructionsFile, "prompt_handoff", "prompt");
    if (uploadError) return { error: uploadError };
  }

  await logCustomerActivity({
    eventType: "project_created",
    organizationId: membership.organization_id,
    projectId: project.id,
    supabase,
    title: "Új projekt létrehozva",
    description: fullProjectName,
    metadata: {
      category,
      agentLanguage,
      agentStyle,
      agentTone,
      promptSourceFiles: Number(Boolean(promptInstructionsFile)) + Number(Boolean(handoffInstructionsFile)),
      knowledgeFiles: knowledgeFiles.length,
      phoneRequestType,
      wantsGoogleAccess,
    },
  });

  redirect(`/portal/agents/${project.id}`);
}
