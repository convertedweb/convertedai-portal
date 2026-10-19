import { createClient } from "@/lib/supabase/server";
import { resolveOnboardingAccounts, type OnboardingAccountDetails } from "./onboarding-accounts";

// Külön lekérdezés, hogy a migráció előtt se törjön el a projektoldal (42703 → alapértelmezett fiókok, nem menthető).
export async function getOnboardingAccounts(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("onboarding_accounts, onboarding_accounts_done, onboarding_account_details")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return { accounts: resolveOnboardingAccounts(null), selectedKeys: null as string[] | null, doneKeys: [] as string[], allDetails: {} as Record<string, OnboardingAccountDetails>, available: false };
  return {
    accounts: resolveOnboardingAccounts(data.onboarding_accounts, data.onboarding_accounts_done ?? [], data.onboarding_account_details ?? {}),
    selectedKeys: data.onboarding_accounts as string[] | null,
    doneKeys: (data.onboarding_accounts_done ?? []) as string[],
    allDetails: (data.onboarding_account_details ?? {}) as Record<string, OnboardingAccountDetails>,
    available: true,
  };
}
