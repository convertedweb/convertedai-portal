"use server";

import { revalidatePath } from "next/cache";
import { canManageProjects, getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateAdminPermissionsState = {
  error?: string;
  success?: string;
};

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export async function updateAdminPermissions(_previousState: UpdateAdminPermissionsState, formData: FormData) {
  const { role, user } = await getCurrentAdminAccess();

  if (!user) {
    return { error: "A mentéshez újra be kell jelentkezni." };
  }

  if (!canManageProjects(role)) {
    return { error: "Jogosultságokat csak superadmin módosíthat." };
  }

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return { error: "Hiányzik a Supabase szerveroldali kulcs. A jogosultságokat most nem lehet menteni." };
  }

  const { error } = await adminSupabase
    .from("admin_permission_settings")
    .upsert(
      {
        role: "admin",
        can_view_customers: checked(formData, "canViewCustomers"),
        can_create_customers: checked(formData, "canCreateCustomers"),
        can_edit_customers: checked(formData, "canEditCustomers"),
        can_invite_customer_users: checked(formData, "canInviteCustomerUsers"),
        can_view_projects: checked(formData, "canViewProjects"),
        can_view_phone_numbers: checked(formData, "canViewPhoneNumbers"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "role" },
    );

  if (error) {
    console.error("Admin permission settings update failed", error);
    return { error: "Nem sikerült menteni a jogosultságokat." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/permissions");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/phone-numbers");
  revalidatePath("/admin/customers/new");

  return { success: "Jogosultságok mentve." };
}
