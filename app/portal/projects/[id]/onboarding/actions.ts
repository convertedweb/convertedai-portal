"use server";

import { revalidatePath } from "next/cache";
import { logCustomerActivity } from "@/lib/activity-log";
import { isOnboardingAccountKey, isValidAccountEmail, normalizeSecretUrl } from "@/lib/onboarding-accounts";
import { isPhoneOwnerType, phoneDocumentCategories } from "@/lib/phone-documents";
import { normalizeSourceLinkUrl } from "@/lib/project-sources";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionState = {
  error?: string;
  success?: string;
};

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

// A jogosultságot a belépett ügyfél saját (RLS-es) lekérdezése adja, az írás az admin klienssel történik.
async function getAccessibleProject(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "A művelethez újra be kell jelentkezni." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, organization_id, status")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();
  if (!project) return { error: "Nem található vagy nem elérhető ez a projekt." };

  return { supabase, project };
}

export async function setOnboardingAccountDone(projectId: string, accountKey: string, done: boolean): Promise<OnboardingActionState> {
  if (!isOnboardingAccountKey(accountKey)) return { error: "Ismeretlen fiók." };

  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase titkos szerveroldali kulcs." };

  const { data: current, error: readError } = await adminSupabase
    .from("projects")
    .select("onboarding_accounts_done")
    .eq("id", projectId)
    .eq("organization_id", access.project.organization_id)
    .is("deleted_at", null)
    .single();
  if (readError || !current) return { error: "A fiók állapota még nem menthető (hiányzik az adatbázis-migráció)." };

  const next = new Set<string>(current.onboarding_accounts_done ?? []);
  if (done) next.add(accountKey); else next.delete(accountKey);

  const { error } = await adminSupabase
    .from("projects")
    .update({ onboarding_accounts_done: [...next] })
    .eq("id", projectId)
    .eq("organization_id", access.project.organization_id)
    .is("deleted_at", null);
  if (error) return { error: "Nem sikerült menteni. Próbáld újra pár másodperc múlva." };

  await logCustomerActivity({
    eventType: "onboarding_account_updated",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: done ? "Onboarding fiók kész" : "Onboarding fiók visszavonva",
    description: accountKey,
  });
  revalidatePath(`/portal/projects/${projectId}/onboarding`);
  return {};
}

// A fiók adatait és a kész jelölést egyben menti; a jelszót nem kérjük, csak az egyszer használatos linket.
export async function saveOnboardingAccount(projectId: string, accountKey: string, email: string, secretUrl: string): Promise<OnboardingActionState> {
  if (!isOnboardingAccountKey(accountKey)) return { error: "Ismeretlen fiók." };
  const cleanEmail = email.trim();
  const cleanUrl = normalizeSecretUrl(secretUrl);
  if (!isValidAccountEmail(cleanEmail)) return { error: "Adj meg egy érvényes e-mail címet." };
  if (!cleanUrl) return { error: "A jelszóhoz egy https://onetimesecret.com… linket adj meg." };

  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase titkos szerveroldali kulcs." };

  const { data: current, error: readError } = await adminSupabase
    .from("projects")
    .select("onboarding_accounts_done, onboarding_account_details")
    .eq("id", projectId)
    .eq("organization_id", access.project.organization_id)
    .is("deleted_at", null)
    .single();
  if (readError || !current) return { error: "A fiók adatai még nem menthetők (hiányzik az adatbázis-migráció)." };

  const done = new Set<string>(current.onboarding_accounts_done ?? []);
  done.add(accountKey);
  const details = { ...(current.onboarding_account_details ?? {}), [accountKey]: { email: cleanEmail, secretUrl: cleanUrl } };

  const { error } = await adminSupabase
    .from("projects")
    .update({ onboarding_accounts_done: [...done], onboarding_account_details: details })
    .eq("id", projectId)
    .eq("organization_id", access.project.organization_id)
    .is("deleted_at", null);
  if (error) return { error: "Nem sikerült menteni. Próbáld újra pár másodperc múlva." };

  await logCustomerActivity({
    eventType: "onboarding_account_saved",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: "Onboarding fiók adatai megadva",
    description: accountKey,
  });
  revalidatePath(`/portal/projects/${projectId}/onboarding`);
  revalidatePath(`/admin/projects/${projectId}`);
  return {};
}

// Soft delete: csak a még fel nem dolgozott (feltöltött vagy hibás) tudásbázis- vagy telefonszám dokumentum törölhető.
export async function deleteOnboardingDocument(projectId: string, documentId: string): Promise<OnboardingActionState> {
  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase titkos szerveroldali kulcs." };

  const { data: document, error } = await adminSupabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("project_id", projectId)
    .eq("organization_id", access.project.organization_id)
    .in("category", ["knowledge_base", ...phoneDocumentCategories])
    .in("processing_status", ["uploaded", "failed"])
    .is("deleted_at", null)
    .select("file_name")
    .maybeSingle();

  if (error) return { error: "Nem sikerült törölni a dokumentumot. Próbáld újra pár másodperc múlva." };
  if (!document) return { error: "Ez a dokumentum már nem törölhető (feldolgozás alatt van, vagy már törölve lett)." };

  await logCustomerActivity({
    eventType: "onboarding_document_deleted",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: "Onboarding dokumentum törölve",
    description: document.file_name,
  });
  revalidatePath(`/portal/projects/${projectId}/onboarding`);
  revalidatePath(`/portal/agents/${projectId}`);
  return {};
}

const maxKnowledgeUrls = 20;

// Tudásbázis forrás URL: weboldal vagy más oldal, ahonnan a csapat tartalmat importál.
export async function addKnowledgeUrl(projectId: string, rawUrl: string, rawNote: string): Promise<OnboardingActionState> {
  const url = normalizeSourceLinkUrl(rawUrl);
  const note = rawNote.trim().slice(0, 300) || null;
  if (!url) return { error: "Adj meg egy érvényes http vagy https címet." };

  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase titkos szerveroldali kulcs." };

  const { count, error: countError } = await adminSupabase
    .from("knowledge_urls")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("organization_id", access.project.organization_id)
    .is("deleted_at", null);
  if (countError) return { error: "Az URL-ek még nem menthetők (hiányzik az adatbázis-migráció)." };
  if ((count ?? 0) >= maxKnowledgeUrls) return { error: `Legfeljebb ${maxKnowledgeUrls} URL adható meg.` };

  const { error } = await adminSupabase.from("knowledge_urls").insert({ organization_id: access.project.organization_id, project_id: projectId, url, note });
  if (error) return { error: error.code === "23505" ? "Ez az URL már szerepel a listában." : "Nem sikerült menteni az URL-t." };

  await logCustomerActivity({
    eventType: "knowledge_url_added",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: "Tudásbázis URL megadva",
    description: url,
  });
  revalidatePath(`/portal/projects/${projectId}/onboarding`);
  revalidatePath(`/portal/agents/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
  return {};
}

export async function removeKnowledgeUrl(projectId: string, urlId: string): Promise<OnboardingActionState> {
  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase titkos szerveroldali kulcs." };

  const { data, error } = await adminSupabase
    .from("knowledge_urls")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", urlId)
    .eq("project_id", projectId)
    .eq("organization_id", access.project.organization_id)
    .is("deleted_at", null)
    .select("url")
    .maybeSingle();
  if (error) return { error: "Nem sikerült törölni az URL-t." };
  if (!data) return { error: "Ez az URL már nem található." };

  await logCustomerActivity({
    eventType: "knowledge_url_removed",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: "Tudásbázis URL törölve",
    description: data.url,
  });
  revalidatePath(`/portal/projects/${projectId}/onboarding`);
  revalidatePath(`/portal/agents/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
  return {};
}

// Számválasztás: új országos (06 21) vagy új körzetes szám, és a számot igénylő tulajdonos típusa.
// A két oszlop nincs az ügyfél írható oszlopai között, ezért admin klienssel írunk, az ügyfél projekt-hozzáférésének ellenőrzése után.
export async function setPhoneSelection(projectId: string, selection: { kind?: string; owner?: string }): Promise<OnboardingActionState> {
  const update: Record<string, string> = {};
  if (selection.kind !== undefined) {
    if (!["hu_21", "local"].includes(selection.kind)) return { error: "Ismeretlen számtípus." };
    update.phone_request_type = selection.kind;
  }
  if (selection.owner !== undefined) {
    if (!isPhoneOwnerType(selection.owner)) return { error: "Ismeretlen tulajdonos típus." };
    update.phone_owner_type = selection.owner;
  }
  if (Object.keys(update).length === 0) return { error: "Nincs mit menteni." };

  const access = await getAccessibleProject(projectId);
  if ("error" in access) return { error: access.error };
  if (access.project.status !== "draft") return { error: "A számtípus a projekt beküldése után már nem módosítható." };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase titkos szerveroldali kulcs." };

  const { data, error } = await adminSupabase
    .from("projects")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("organization_id", access.project.organization_id)
    .eq("status", "draft")
    .in("category", ["voice_agent", "meta_lead_caller"])
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return { error: "Nem sikerült menteni a választást (az adatbázis-migráció alkalmazva van?). Próbáld újra pár másodperc múlva." };
  if (!data) return { error: "Ehhez a projekthez nem választható számtípus." };

  await logCustomerActivity({
    eventType: "phone_selection_changed",
    organizationId: access.project.organization_id,
    projectId,
    supabase: access.supabase,
    title: "Telefonszám választás módosítva",
    description: Object.values(update).join(", "),
  });
  revalidatePath(`/portal/projects/${projectId}/onboarding`);
  revalidatePath(`/portal/agents/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
  return {};
}
