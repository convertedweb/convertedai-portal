import { createClient } from "@/lib/supabase/server";
import { resolveAssistantFields, type AssistantFieldKey } from "./onboarding-fields";

// Külön lekérdezés, hogy a migráció előtt se törjön el az oldal (42703 → alapértelmezett mezők).
export async function getOnboardingFieldConfig(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("onboarding_field_config")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  const stored = !error && Array.isArray(data?.onboarding_field_config?.assistant) ? (data.onboarding_field_config.assistant as string[]) : null;
  return { assistantFields: resolveAssistantFields(stored) as AssistantFieldKey[], available: !error };
}
