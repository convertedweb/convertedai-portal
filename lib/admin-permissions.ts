import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AdminRole = "superadmin" | "admin";

export type AdminAccess = {
  permissions: AdminPermissionSettings;
  user: User | null;
  role: AdminRole | null;
};

export type AdminPermissionSettings = {
  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canInviteCustomerUsers: boolean;
  canViewCustomers: boolean;
  canViewPhoneNumbers: boolean;
  canViewProjects: boolean;
};

export const defaultAdminPermissionSettings: AdminPermissionSettings = {
  canCreateCustomers: true,
  canEditCustomers: true,
  canInviteCustomerUsers: true,
  canViewCustomers: true,
  canViewPhoneNumbers: true,
  canViewProjects: true,
};

export function canManageCustomers(role: AdminRole | null, permissions: AdminPermissionSettings = defaultAdminPermissionSettings) {
  return role === "superadmin" || (role === "admin" && permissions.canViewCustomers);
}

export function canCreateCustomers(role: AdminRole | null, permissions: AdminPermissionSettings = defaultAdminPermissionSettings) {
  return role === "superadmin" || (role === "admin" && permissions.canCreateCustomers);
}

export function canEditCustomers(role: AdminRole | null, permissions: AdminPermissionSettings = defaultAdminPermissionSettings) {
  return role === "superadmin" || (role === "admin" && permissions.canEditCustomers);
}

export function canInviteCustomerUsers(role: AdminRole | null, permissions: AdminPermissionSettings = defaultAdminPermissionSettings) {
  return role === "superadmin" || (role === "admin" && permissions.canInviteCustomerUsers);
}

export function canManageProjects(role: AdminRole | null) {
  return role === "superadmin";
}

export function canViewProjects(role: AdminRole | null, permissions: AdminPermissionSettings = defaultAdminPermissionSettings) {
  return role === "superadmin" || (role === "admin" && permissions.canViewProjects);
}

export function canViewPhoneNumbers(role: AdminRole | null, permissions: AdminPermissionSettings = defaultAdminPermissionSettings) {
  return role === "superadmin" || (role === "admin" && permissions.canViewPhoneNumbers);
}

export function getAdminRoleLabel(role: AdminRole | null) {
  return role === "superadmin" ? "Superadmin" : role === "admin" ? "Admin" : "Admin";
}

export async function getCurrentAdminAccess(): Promise<AdminAccess> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return { user: null, role: null, permissions: defaultAdminPermissionSettings };

  const { data: superAdminRows } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (superAdminRows?.length) return { user, role: "superadmin", permissions: defaultAdminPermissionSettings };

  const { data: adminRoleRows } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1);
  const role = adminRoleRows?.[0]?.role;

  return {
    permissions: await getAdminPermissionSettings(),
    user,
    role: role === "superadmin" || role === "admin" ? role : null,
  };
}

export async function getAdminPermissionSettings(): Promise<AdminPermissionSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("admin_permission_settings")
      .select("can_view_customers, can_create_customers, can_edit_customers, can_invite_customer_users, can_view_projects, can_view_phone_numbers")
      .eq("role", "admin")
      .maybeSingle();

    if (error || !data) return defaultAdminPermissionSettings;

    return {
      canCreateCustomers: Boolean(data.can_create_customers),
      canEditCustomers: Boolean(data.can_edit_customers),
      canInviteCustomerUsers: Boolean(data.can_invite_customer_users),
      canViewCustomers: Boolean(data.can_view_customers),
      canViewPhoneNumbers: Boolean(data.can_view_phone_numbers),
      canViewProjects: Boolean(data.can_view_projects),
    };
  } catch {
    return defaultAdminPermissionSettings;
  }
}
