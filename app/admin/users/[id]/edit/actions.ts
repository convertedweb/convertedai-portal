"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageProjects, getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type EditAdminUserState = {
  error?: string;
  success?: string;
};

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function assertEditableAdmin(userId: string) {
  const access = await getCurrentAdminAccess();
  if (!access.user) return "A módosításhoz újra be kell jelentkezni.";
  if (!canManageProjects(access.role)) return "Admin felhasználót csak superadmin módosíthat.";

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return "Hiányzik a Supabase titkos szerveroldali kulcs.";

  const [{ data: adminRows }, { data: superAdminRows }] = await Promise.all([
    adminSupabase.from("admin_roles").select("id, role").eq("user_id", userId).eq("role", "admin").limit(1),
    adminSupabase.from("super_admins").select("user_id").eq("user_id", userId).limit(1),
  ]);

  if (superAdminRows?.length) return "Superadmin felhasználót innen nem lehet módosítani.";
  if (!adminRows?.length) return "Ez a felhasználó nem sima Admin szerepkörű.";

  return adminSupabase;
}

export async function updateAdminUser(_previousState: EditAdminUserState, formData: FormData): Promise<EditAdminUserState> {
  const userId = requiredText(formData.get("userId"));
  const fullName = requiredText(formData.get("fullName"));
  const email = requiredText(formData.get("email")).toLowerCase();

  if (!userId || !fullName || !email) return { error: "A név és az e-mail cím kötelező." };

  const adminSupabase = await assertEditableAdmin(userId);
  if (typeof adminSupabase === "string") return { error: adminSupabase };

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
    email,
    user_metadata: { full_name: fullName, name: fullName },
  });

  if (error) {
    console.error("Admin user update failed", error);
    return { error: "Nem sikerült módosítani az Admin felhasználót. Ellenőrizd, hogy az e-mail cím nincs-e már használatban." };
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}/edit`);

  return { success: "Admin felhasználó módosítva." };
}

export async function deleteAdminUser(_previousState: EditAdminUserState, formData: FormData): Promise<EditAdminUserState> {
  const userId = requiredText(formData.get("userId"));
  if (!userId) return { error: "Hiányzik a felhasználó azonosítója." };

  const adminSupabase = await assertEditableAdmin(userId);
  if (typeof adminSupabase === "string") return { error: adminSupabase };

  const { error: roleDeleteError } = await adminSupabase.from("admin_roles").delete().eq("user_id", userId);
  if (roleDeleteError) {
    console.error("Admin role delete failed", roleDeleteError);
    return { error: "Nem sikerült törölni az Admin jogosultságot." };
  }

  const { error: userDeleteError } = await adminSupabase.auth.admin.deleteUser(userId);
  if (userDeleteError) {
    console.error("Admin auth user delete failed", userDeleteError);
    return { error: "Az Admin jogosultság törölve lett, de a felhasználói fiókot nem sikerült törölni." };
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}
