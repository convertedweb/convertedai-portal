import type { createAdminClient } from "@/lib/supabase/admin";

export const maxOrgMembers = 2;

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

// Az adatbázis trigger a végső védelem; ez csak előre, meghívás előtt ad érthető hibát.
export async function getOrgMemberLimitError(
  adminSupabase: AdminClient,
  organizationId: string,
  role: "client_owner" | "client_member",
  excludeUserId?: string,
) {
  const { data, error } = await adminSupabase.from("org_members").select("user_id, role").eq("organization_id", organizationId);
  if (error) return null;
  const others = (data ?? []).filter((member) => member.user_id !== excludeUserId && member.role === role);
  if (role === "client_owner" && others.length >= 1) return "Ennek az ügyfélnek már van tulajdonosa. Előbb a meglévő tulajdonost kell eltávolítani vagy módosítani.";
  if (role === "client_member" && others.length >= maxOrgMembers) return `Egy ügyfélhez legfeljebb ${maxOrgMembers} munkatárs rendelhető.`;
  return null;
}
